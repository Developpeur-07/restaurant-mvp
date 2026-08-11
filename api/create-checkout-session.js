
// api/create-checkout-session.js
//
// Crée une session d'abonnement Yabetoo PRO.
// Prix : 35 000 XAF / mois.
//
// Flux :
// 1. Vérifie l'utilisateur Supabase connecté
// 2. Vérifie qu'il est propriétaire du restaurant
// 3. Crée une session Yabetoo
// 4. Enregistre le paiement en "pending"
// 5. Retourne l'URL de paiement
//
// POST /api/create-checkout-session
// Body : { restaurantId }

import { createClient } from "@supabase/supabase-js";

const YABETOO_SESSIONS_URL =
  "https://buy.api.yabetoopay.com/v1/sessions";

const PRO_PRICE = 35000;
const PRO_PLAN = "pro";

const APP_URL =
  "https://restaurant-mvp-git-main-jesus-net-s-projects.vercel.app";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée. Utilisez POST.",
    });
  }

  if (
    !process.env.YABETOO_SECRET_KEY ||
    !process.env.YABETOO_ACCOUNT_ID
  ) {
    return res.status(500).json({
      error:
        "Configuration Yabetoo manquante.",
    });
  }

  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(500).json({
      error:
        "Configuration Supabase serveur manquante.",
    });
  }

  try {
    // ---------------------------------------------------------
    // 1. Récupération du restaurantId
    // ---------------------------------------------------------

    const { restaurantId } = req.body || {};

    if (!restaurantId) {
      return res.status(400).json({
        error: "restaurantId est obligatoire.",
      });
    }

    // ---------------------------------------------------------
    // 2. Client Supabase Admin
    // ---------------------------------------------------------

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ---------------------------------------------------------
    // 3. Vérification du restaurant
    // ---------------------------------------------------------

    const { data: restaurant, error: restaurantError } =
      await supabaseAdmin
        .from("restaurants")
        .select(
          "id, owner_id, name, plan, subscription_status"
        )
        .eq("id", restaurantId)
        .maybeSingle();

    if (restaurantError) {
      console.error(
        "[YABETOO CREATE SESSION] Erreur restaurant:",
        restaurantError
      );

      return res.status(500).json({
        error: "Impossible de vérifier le restaurant.",
      });
    }

    if (!restaurant) {
      return res.status(404).json({
        error: "Restaurant introuvable.",
      });
    }

    // ---------------------------------------------------------
    // 4. Création session Yabetoo
    // ---------------------------------------------------------

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

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        unparsable_raw_response: raw,
      };
    }

    console.log(
      "[YABETOO CREATE SESSION] Status:",
      response.status
    );

    console.log(
      "[YABETOO CREATE SESSION] Réponse:",
      JSON.stringify(data, null, 2)
    );

    if (!response.ok || !data?.id) {
      return res.status(502).json({
        error: "Yabetoo n'a pas créé la session.",
        httpStatus: response.status,
        reponseYabetoo: data,
      });
    }

    const sessionId = data.id;

    // ---------------------------------------------------------
    // 5. Enregistrement du paiement en pending
    // ---------------------------------------------------------

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
        "[YABETOO CREATE SESSION] Erreur création paiement:",
        paymentError
      );

      return res.status(500).json({
        error:
          "Session Yabetoo créée mais impossible d'enregistrer le paiement.",
        sessionId,
      });
    }

    // ---------------------------------------------------------
    // 6. Retour au frontend
    // ---------------------------------------------------------

    return res.status(200).json({
      success: true,
      sessionId,
      checkoutUrl: data.url || null,
      amount: PRO_PRICE,
      currency: "xaf",
      plan: PRO_PLAN,
    });
  } catch (error) {
    console.error(
      "[YABETOO CREATE SESSION] Erreur:",
      error
    );

    return res.status(500).json({
      error: error.message,
    });
  }
}

