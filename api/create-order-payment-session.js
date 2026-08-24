// api/create-order-payment-session.js
//
// Création d'une session de paiement Yabetoo pour une commande client final
// (order_type = 'emporter'). Distinct de api/create-checkout-session.js
// (abonnement B2B propriétaire) : ce endpoint est PUBLIC, sans authentification
// Supabase — le client final n'a pas de compte. La sécurité repose sur le
// recalcul du montant côté serveur à partir des items réellement enregistrés
// en base, jamais sur un montant transmis par le frontend.
//
// POST /api/create-order-payment-session
//
// Body :
// {
//   "orderId": "uuid-de-la-commande"
// }

import { createClient } from "@supabase/supabase-js";

const YABETOO_SESSIONS_URL = "https://buy.api.yabetoopay.com/v1/sessions";

const APP_URL =
  "https://restaurant-mvp-git-main-jesus-net-s-projects.vercel.app";

export default async function handler(req, res) {
  // ---------------------------------------------------------
  // 1. Vérification méthode HTTP
  // ---------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée. Utilisez POST.",
    });
  }

  // ---------------------------------------------------------
  // 2. Vérification variables serveur
  // ---------------------------------------------------------

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[YABETOO ORDER SESSION] Configuration Supabase serveur manquante.",
    );

    return res.status(500).json({
      error: "Configuration Supabase serveur manquante.",
    });
  }

  if (!process.env.YABETOO_SECRET_KEY || !process.env.YABETOO_ACCOUNT_ID) {
    console.error("[YABETOO ORDER SESSION] Configuration Yabetoo manquante.");

    return res.status(500).json({
      error: "Configuration Yabetoo manquante.",
    });
  }

  try {
    // -------------------------------------------------------
    // 3. Récupération de orderId
    // -------------------------------------------------------

    const { orderId } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        error: "orderId est obligatoire.",
      });
    }

    // -------------------------------------------------------
    // 4. Client Supabase serveur
    // -------------------------------------------------------

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // -------------------------------------------------------
    // 5. Récupération de la commande — source de vérité pour
    //    le montant, le type et le restaurant
    // -------------------------------------------------------

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, order_type, status, items, customer_name")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "[YABETOO ORDER SESSION] Erreur récupération commande:",
        orderError,
      );

      return res.status(500).json({
        error: "Impossible de retrouver la commande.",
      });
    }

    if (!order) {
      return res.status(404).json({
        error: "Commande introuvable.",
      });
    }

    // -------------------------------------------------------
    // 6. Vérifications métier
    // -------------------------------------------------------

    if (order.order_type !== "emporter") {
      console.warn(
        "[YABETOO ORDER SESSION] Type de commande non payable en ligne:",
        order.order_type,
      );

      return res.status(400).json({
        error: "Cette commande ne nécessite pas de paiement en ligne.",
      });
    }

    if (order.status !== "pending_payment") {
      // Déjà payée, ou dans un autre état — on n'ouvre pas de nouvelle
      // session pour éviter un double paiement.
      console.warn(
        "[YABETOO ORDER SESSION] Commande pas en attente de paiement:",
        order.status,
      );

      return res.status(409).json({
        error: "Cette commande n'est plus en attente de paiement.",
        status: order.status,
      });
    }

    // -------------------------------------------------------
    // 7. Recalcul du montant côté serveur — jamais fait confiance
    //    à un montant transmis par le client
    // -------------------------------------------------------

    const items = Array.isArray(order.items) ? order.items : [];

    const amount = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0,
    );

    if (!amount || amount <= 0) {
      console.error(
        "[YABETOO ORDER SESSION] Montant invalide calculé pour la commande:",
        orderId,
      );

      return res.status(400).json({
        error: "Impossible de calculer le montant de la commande.",
      });
    }

    // -------------------------------------------------------
    // 8. Création session Yabetoo
    // -------------------------------------------------------

    const response = await fetch(YABETOO_SESSIONS_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.YABETOO_SECRET_KEY}`,
      },

      body: JSON.stringify({
        total: amount,

        currency: "xaf",

        accountId: process.env.YABETOO_ACCOUNT_ID,

        successUrl: `${APP_URL}/tracking/${orderId}?payment=success`,

        cancelUrl: `${APP_URL}/tracking/${orderId}?payment=cancelled`,

        items: [
          {
            productId: "order_emporter",
            productName: `Commande à emporter${order.customer_name ? " — " + order.customer_name : ""}`,
            quantity: 1,
            price: amount,
          },
        ],

        metadata: {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
        },
      }),
    });

    // -------------------------------------------------------
    // 9. Lecture réponse Yabetoo
    // -------------------------------------------------------

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        unparsable_raw_response: raw,
      };
    }

    console.log("[YABETOO ORDER SESSION] Status HTTP:", response.status);
    console.log("[YABETOO ORDER SESSION] Session ID:", data?.id || null);

    if (!response.ok || !data?.id) {
      console.error(
        "[YABETOO ORDER SESSION] Création session échouée:",
        JSON.stringify(data, null, 2),
      );

      return res.status(502).json({
        error: "Yabetoo n'a pas créé la session de paiement.",
        httpStatus: response.status,
        reponseYabetoo: data,
      });
    }

    const sessionId = data.id;

    // -------------------------------------------------------
    // 10. Enregistrement du paiement pending
    // -------------------------------------------------------

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        provider: "yabetoo",
        transaction_id: sessionId,
        status: "pending",
        amount,
      });

    if (paymentError) {
      console.error(
        "[YABETOO ORDER SESSION] Erreur enregistrement paiement:",
        paymentError,
      );

      return res.status(500).json({
        error:
          "Session Yabetoo créée, mais impossible d'enregistrer le paiement.",
        sessionId,
      });
    }

    console.log("[YABETOO ORDER SESSION] Paiement pending créé:", {
      orderId: order.id,
      transactionId: sessionId,
      amount,
    });

    // -------------------------------------------------------
    // 11. Réponse frontend
    // -------------------------------------------------------

    return res.status(200).json({
      success: true,
      sessionId,
      checkoutUrl: data.url || null,
      amount,
      currency: "xaf",
    });
  } catch (error) {
    console.error("[YABETOO ORDER SESSION] Erreur serveur:", error);

    return res.status(500).json({
      error: "Erreur interne lors de la création du paiement.",
    });
  }
}