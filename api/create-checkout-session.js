// api/create-checkout-session.js
//
// Création d'une session d'abonnement Yabetoo PRO.
//
// Sécurité :
// 1. L'utilisateur doit être authentifié avec Supabase.
// 2. Le restaurant demandé doit appartenir à cet utilisateur.
// 3. Le montant est fixé côté serveur à 35 000 XAF.
// 4. Le plan est fixé côté serveur à "pro".
// 5. Le service_role_key reste uniquement côté serveur.
//
// POST /api/create-checkout-session
//
// Body :
// {
//   "restaurantId": "uuid-du-restaurant"
// }

import { createClient } from "@supabase/supabase-js";

const YABETOO_SESSIONS_URL = "https://buy.api.yabetoopay.com/v1/sessions";

const PRO_PRICE = process.env.YABETOO_TEST_MODE === "true" ? 100 : 35000;
const PRO_PLAN = "pro";

const APP_URL =
  "https://restaurant-mvp-jesus-net-s-projects.vercel.app";

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
      "[YABETOO CREATE SESSION] Configuration Supabase serveur manquante.",
    );

    return res.status(500).json({
      error: "Configuration Supabase serveur manquante.",
    });
  }

  if (!process.env.YABETOO_SECRET_KEY || !process.env.YABETOO_ACCOUNT_ID) {
    console.error("[YABETOO CREATE SESSION] Configuration Yabetoo manquante.");

    return res.status(500).json({
      error: "Configuration Yabetoo manquante.",
    });
  }

  try {
    // -------------------------------------------------------
    // 3. Récupération du token Supabase
    // -------------------------------------------------------

    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: "Authentification requise.",
      });
    }

    const [scheme, accessToken] = authorization.split(" ");

    if (scheme !== "Bearer" || !accessToken) {
      return res.status(401).json({
        error: "Token d'authentification invalide.",
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
    // 5. Vérification du JWT Supabase
    // -------------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      console.error(
        "[YABETOO CREATE SESSION] Utilisateur non authentifié:",
        authError?.message,
      );

      return res.status(401).json({
        error: "Session utilisateur invalide ou expirée.",
      });
    }

    console.log("[YABETOO CREATE SESSION] Utilisateur authentifié:", user.id);

    // -------------------------------------------------------
    // 6. Récupération du restaurantId
    // -------------------------------------------------------

    const { restaurantId } = req.body || {};

    if (!restaurantId) {
      return res.status(400).json({
        error: "restaurantId est obligatoire.",
      });
    }

    // -------------------------------------------------------
    // 7. Vérification que le restaurant appartient
    //    réellement à l'utilisateur connecté
    // -------------------------------------------------------

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_id, name, plan, subscription_status")
      .eq("id", restaurantId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "[YABETOO CREATE SESSION] Erreur vérification restaurant:",
        restaurantError,
      );

      return res.status(500).json({
        error: "Impossible de vérifier le restaurant.",
      });
    }

    if (!restaurant) {
      console.warn("[YABETOO CREATE SESSION] Accès restaurant refusé:", {
        userId: user.id,
        restaurantId,
      });

      return res.status(403).json({
        error: "Vous n'êtes pas propriétaire de ce restaurant.",
      });
    }

    console.log("[YABETOO CREATE SESSION] Restaurant vérifié:", {
      restaurantId: restaurant.id,
      ownerId: restaurant.owner_id,
      restaurantName: restaurant.name,
    });

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
        total: PRO_PRICE,

        currency: "xaf",

        accountId: process.env.YABETOO_ACCOUNT_ID,

        successUrl: `${APP_URL}/settings?payment=success`,

        cancelUrl: `${APP_URL}/settings?payment=cancelled`,

        items: [
          {
            productId: "prod_abonnement_pro",

            productName: "Abonnement PRO Le Resto-HUB",

            quantity: 1,

            price: PRO_PRICE,
          },
        ],

        metadata: {
          restaurant_id: restaurant.id,
          plan: PRO_PLAN,
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

    console.log("[YABETOO CREATE SESSION] Status HTTP:", response.status);

    console.log("[YABETOO CREATE SESSION] Session ID:", data?.id || null);

    // -------------------------------------------------------
    // 10. Vérification création session
    // -------------------------------------------------------

    if (!response.ok || !data?.id) {
      console.error(
        "[YABETOO CREATE SESSION] Création session échouée:",
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
    // 11. Enregistrement du paiement
    // -------------------------------------------------------

    const { error: paymentError } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        restaurant_id: restaurant.id,
        amount: PRO_PRICE,
        provider: "yabetoo",
        transaction_id: sessionId,
        status: "pending",
      });

    if (paymentError) {
      console.error(
        "[YABETOO CREATE SESSION] Erreur enregistrement paiement:",
        paymentError,
      );

      return res.status(500).json({
        error:
          "Session Yabetoo créée, mais impossible d'enregistrer le paiement.",
        sessionId,
      });
    }

    console.log("[YABETOO CREATE SESSION] Paiement pending créé:", {
      restaurantId: restaurant.id,
      transactionId: sessionId,
      amount: PRO_PRICE,
      provider: "yabetoo",
    });

    // -------------------------------------------------------
    // 12. Réponse frontend
    // -------------------------------------------------------

    return res.status(200).json({
      success: true,

      sessionId,

      checkoutUrl: data.url || null,

      amount: PRO_PRICE,

      currency: "xaf",

      plan: PRO_PLAN,
    });
  } catch (error) {
    console.error("[YABETOO CREATE SESSION] Erreur serveur:", error);

    return res.status(500).json({
      error: "Erreur interne lors de la création du paiement.",
    });
  }
}
