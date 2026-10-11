// api/create-order-payment-session.js
//
// Création d'une session de paiement Yabetoo pour une commande client final
// (order_type = 'emporter'). Distinct de api/create-checkout-session.js
// (abonnement B2B propriétaire) : ce endpoint est PUBLIC, sans authentification
// Supabase — le client final n'a pas de compte. La sécurité repose sur le
// recalcul du montant côté serveur à partir des items réellement enregistrés
// en base, jamais sur un montant transmis par le frontend.
//
// ⚠️ VERSION TEST — vise à isoler la cause du 500 Yabetoo générique.
// Changements marqués // TEST, à retirer une fois la cause confirmée.
//
// POST /api/create-order-payment-session
//
// Body :
// {
//   "orderId": "uuid-de-la-commande"
// }

import { createClient } from "@supabase/supabase-js";

const YABETOO_SESSIONS_URL = "https://buy.api.yabetoopay.com/v1/sessions";

const getAppUrl = () => {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://restaurant-mvp-jesus-net-s-projects.vercel.app";
};

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

    const { orderId, sessionId } = req.body || {};

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
    // 5. Récupération de la commande parente — source de vérité pour
    //    le type et le restaurant
    // -------------------------------------------------------

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, order_type, status, items, customer_name, table_number, session_id")
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

    if (order.status === "cancelled") {
      console.warn(
        "[YABETOO ORDER SESSION] Commande annulée:",
        order.status,
      );

      return res.status(409).json({
        error: "Cette commande a été annulée.",
        status: order.status,
      });
    }

    const activeSessionId = sessionId || order.session_id || null;

    // ── Vérification si un paiement a déjà été validé pour cette commande ou sa session ──
    let existingPaidPayment = null;

    if (activeSessionId) {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("status", "succeeded")
        .or(`order_id.eq.${order.id},session_id.eq.${activeSessionId}`)
        .limit(1)
        .maybeSingle();

      if (!error) {
        existingPaidPayment = data;
      } else {
        // En cas d'erreur (ex: colonne session_id manquante), repli sur order_id seul
        const { data: fallbackPaid } = await supabaseAdmin
          .from("payments")
          .select("id, status")
          .eq("status", "succeeded")
          .eq("order_id", order.id)
          .limit(1)
          .maybeSingle();

        existingPaidPayment = fallbackPaid;
      }
    } else {
      const { data } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("status", "succeeded")
        .eq("order_id", order.id)
        .limit(1)
        .maybeSingle();

      existingPaidPayment = data;
    }

    if (existingPaidPayment) {
      console.warn(
        "[YABETOO ORDER SESSION] Commande ou session déjà payée dans la table payments:",
        existingPaidPayment.id
      );

      return res.status(409).json({
        error: "Cette commande ou session de table a déjà été payée.",
        status: "paid",
      });
    }

    // -------------------------------------------------------
    // 7. Recalcul du montant côté serveur — si sessionId fourni,
    //    somme de toutes les commandes actives de la session
    // -------------------------------------------------------

    let ordersToCharge = [order];

    if (activeSessionId) {
      const { data: sessionOrders, error: sessionOrdersError } = await supabaseAdmin
        .from("orders")
        .select("id, restaurant_id, order_type, status, items, customer_name, table_number")
        .eq("session_id", activeSessionId)
        .neq("status", "cancelled");

      if (!sessionOrdersError && sessionOrders && sessionOrders.length > 0) {
        ordersToCharge = sessionOrders;
      }
    }

    const realAmount = ordersToCharge.reduce((totalSum, ord) => {
      const items = Array.isArray(ord.items) ? ord.items : [];
      return (
        totalSum +
        items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
          0
        )
      );
    }, 0);

    if (!realAmount || realAmount <= 0) {
      console.error(
        "[YABETOO ORDER SESSION] Montant invalide calculé pour la commande:",
        orderId,
      );

      return res.status(400).json({
        error: "Impossible de calculer le montant de la commande.",
      });
    }

    // TEST — on isole la variable montant : en mode test on force 100 XAF
    const amount =
      process.env.YABETOO_TEST_MODE === "true" ? 100 : realAmount;

    console.log("[YABETOO ORDER SESSION] Montant réel:", realAmount, "| Montant envoyé:", amount, "| Commandes incluses:", ordersToCharge.length);

    // -------------------------------------------------------
    // 8. Création session Yabetoo
    // -------------------------------------------------------

    const appUrl = getAppUrl();
    const productName = activeSessionId && ordersToCharge.length > 1
      ? `Table ${order.table_number || ''} — ${ordersToCharge.length} commandes`
      : order.order_type === 'emporter'
        ? `Commande à emporter${order.customer_name ? " — " + order.customer_name : ""}`
        : `Commande sur place — Table ${order.table_number || ''}`;

    const response = await fetch(YABETOO_SESSIONS_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.YABETOO_SECRET_KEY}`,
      },

      body: JSON.stringify({
        total: amount,

        currency: "XAF",

        accountId: process.env.YABETOO_ACCOUNT_ID,

        successUrl: `${appUrl}/tracking/${orderId}?payment=success`,

        cancelUrl: `${appUrl}/tracking/${orderId}?payment=cancelled`,

        items: [
          {
            productId: "prod_abonnement_pro",
            productName,
            quantity: 1,
            price: amount,
          },
        ],

        metadata: {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
          ...(activeSessionId ? { session_id: activeSessionId } : {}),
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

    const yabetooSessionId = data.id;

    // -------------------------------------------------------
    // 10. Enregistrement du paiement pending
    // -------------------------------------------------------

    const paymentPayload = {
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      provider: "yabetoo",
      transaction_id: yabetooSessionId,
      status: "pending",
      amount,
      ...(activeSessionId ? { session_id: activeSessionId } : {}),
    };

    let { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert(paymentPayload);

    // Repli immédiat : si l'insertion avec session_id échoue (ex: migration 019 non encore exécutée),
    // on tente l'insertion sans session_id pour enregistrer le paiement pending et débloquer le client.
    if (paymentError && paymentPayload.session_id) {
      console.warn(
        "[YABETOO ORDER SESSION] Échec insertion avec session_id, tentative de repli sans session_id:",
        paymentError.message
      );

      const { session_id, ...fallbackPayload } = paymentPayload;
      const { error: fallbackError } = await supabaseAdmin
        .from("payments")
        .insert(fallbackPayload);

      if (!fallbackError) {
        console.log(
          "[YABETOO ORDER SESSION] Paiement pending enregistré avec succès en mode repli (sans session_id)."
        );
        paymentError = null;
      } else {
        paymentError = fallbackError;
      }
    }

    if (paymentError) {
      console.error(
        "[YABETOO ORDER SESSION] Erreur enregistrement paiement:",
        paymentError,
      );

      return res.status(500).json({
        error:
          "Session Yabetoo créée, mais impossible d'enregistrer le paiement.",
        sessionId: yabetooSessionId,
        details: paymentError.message || String(paymentError),
        code: paymentError.code || null,
      });
    }

    console.log("[YABETOO ORDER SESSION] Paiement pending créé:", {
      orderId: order.id,
      transactionId: yabetooSessionId,
      amount,
    });

    // -------------------------------------------------------
    // 11. Réponse frontend
    // -------------------------------------------------------

    const rawCheckoutUrl = data.url || data.checkoutUrl || null;
    const checkoutUrl = rawCheckoutUrl
      ? rawCheckoutUrl.replace("pay.yabetoopay.com", "pay.yabetoo.com")
      : null;

    return res.status(200).json({
      success: true,
      sessionId: yabetooSessionId,
      checkoutUrl,
      amount,
      currency: "XAF",
    });
  } catch (error) {
    console.error("[YABETOO ORDER SESSION] Erreur serveur:", error);

    return res.status(500).json({
      error: "Erreur interne lors de la création du paiement.",
    });
  }
}