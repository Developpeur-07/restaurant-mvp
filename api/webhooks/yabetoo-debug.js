```javascript
// api/webhooks/yabetoo-debug.js
//
// Webhook Yabetoo — production
//
// Rôle :
// 1. Vérifier que la requête est POST.
// 2. Lire le body brut.
// 3. Vérifier la signature HMAC-SHA256.
// 4. Vérifier le timestamp.
// 5. Vérifier le paiement.
// 6. Retrouver le paiement pending via transaction_id.
// 7. Éviter le traitement d'un paiement déjà confirmé.
// 8. Passer subscription_payments -> succeeded.
// 9. Passer restaurants -> active.
// 10. Mettre à jour le plan PRO.
// 11. Définir la prochaine échéance.
// 12. Enregistrer subscription_events.
//
// Variables Vercel requises :
//
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// YABETOO_WEBHOOK_SECRET
//
// IMPORTANT :
// Le service_role_key doit rester uniquement côté serveur.

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ---------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------

const PRO_PRICE = 35000;
const PRO_PLAN = "pro";
const PROVIDER = "yabetoo";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

// ---------------------------------------------------------
// LECTURE DU BODY BRUT
// ---------------------------------------------------------

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

// ---------------------------------------------------------
// COMPARAISON HMAC SÉCURISÉE
// ---------------------------------------------------------

function timingSafeEqualHex(a, b) {
  if (!a || !b) {
    return false;
  }

  try {
    const aBuffer = Buffer.from(a, "hex");
    const bBuffer = Buffer.from(b, "hex");

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------
// CALCUL SIGNATURE
// ---------------------------------------------------------

function calculateSignature(timestamp, rawBody, secret) {
  const signedPayload = `${timestamp}.${rawBody}`;

  return crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

// ---------------------------------------------------------
// AJOUT D'UN MOIS
// ---------------------------------------------------------

function addOneMonth(date) {
  const result = new Date(date);

  result.setUTCMonth(result.getUTCMonth() + 1);

  return result;
}

// ---------------------------------------------------------
// HANDLER
// ---------------------------------------------------------

export default async function handler(req, res) {
  // -------------------------------------------------------
  // 1. MÉTHODE HTTP
  // -------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée. Le webhook doit être en POST.",
    });
  }

  // -------------------------------------------------------
  // 2. VARIABLES D'ENVIRONNEMENT
  // -------------------------------------------------------

  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "[YABETOO WEBHOOK] Configuration Supabase manquante."
    );

    return res.status(500).json({
      error: "Configuration Supabase serveur manquante.",
    });
  }

  const webhookSecret = process.env.YABETOO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[YABETOO WEBHOOK] YABETOO_WEBHOOK_SECRET manquante."
    );

    return res.status(500).json({
      error: "Configuration webhook manquante.",
    });
  }

  try {
    // -----------------------------------------------------
    // 3. BODY BRUT
    // -----------------------------------------------------

    const rawBody = await getRawBody(req);

    if (!rawBody) {
      return res.status(400).json({
        error: "Body webhook vide.",
      });
    }

    // -----------------------------------------------------
    // 4. HEADERS YABETOO
    // -----------------------------------------------------

    const signature =
      req.headers["x-yabetoo-webhook-signature"];

    const timestamp =
      req.headers["x-yabetoo-webhook-timestamp"];

    const event =
      req.headers["x-yabetoo-webhook-event"];

    const webhookId =
      req.headers["x-yabetoo-webhook-id"];

    console.log("========== WEBHOOK YABETOO ==========");

    console.log("[YABETOO WEBHOOK] Event:", event);
    console.log("[YABETOO WEBHOOK] ID:", webhookId);
    console.log("[YABETOO WEBHOOK] Timestamp:", timestamp);

    // -----------------------------------------------------
    // 5. SIGNATURE / TIMESTAMP
    // -----------------------------------------------------

    if (!signature || !timestamp) {
      console.error(
        "[YABETOO WEBHOOK] Signature ou timestamp manquant."
      );

      return res.status(401).json({
        error: "Signature webhook manquante.",
      });
    }

    // -----------------------------------------------------
    // 6. VALIDATION TIMESTAMP
    // -----------------------------------------------------

    const timestampSeconds = Number(timestamp);

    if (!Number.isFinite(timestampSeconds)) {
      console.error(
        "[YABETOO WEBHOOK] Timestamp invalide."
      );

      return res.status(401).json({
        error: "Timestamp webhook invalide.",
      });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      Math.abs(nowSeconds - timestampSeconds) >
      WEBHOOK_TOLERANCE_SECONDS
    ) {
      console.error(
        "[YABETOO WEBHOOK] Timestamp expiré."
      );

      return res.status(401).json({
        error: "Timestamp webhook expiré.",
      });
    }

    // -----------------------------------------------------
    // 7. VÉRIFICATION HMAC
    // -----------------------------------------------------

    const expectedSignature = calculateSignature(
      timestamp,
      rawBody,
      webhookSecret
    );

    const signatureValid = timingSafeEqualHex(
      signature,
      expectedSignature
    );

    console.log(
      "[YABETOO WEBHOOK] Signature valide:",
      signatureValid
    );

    if (!signatureValid) {
      console.error(
        "[YABETOO WEBHOOK] SIGNATURE INVALIDE."
      );

      return res.status(401).json({
        error: "Signature webhook invalide.",
      });
    }

    // -----------------------------------------------------
    // 8. PARSING JSON
    // -----------------------------------------------------

    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error(
        "[YABETOO WEBHOOK] JSON invalide:",
        error.message
      );

      return res.status(400).json({
        error: "Payload JSON invalide.",
      });
    }

    // -----------------------------------------------------
    // 9. EXTRACTION PAIEMENT
    // -----------------------------------------------------

    const intent = payload?.data?.intent;
    const charge = payload?.data?.charge;

    const intentId = intent?.id || null;
    const intentStatus = intent?.status || null;

    const amount = Number(intent?.amount || 0);

    const currency = String(
      intent?.currency || ""
    ).toLowerCase();

    const metadata =
      intent?.metadata || {};

    const restaurantId =
      metadata.restaurant_id || null;

    const checkoutSessionId =
      metadata.checkout_session_id ||
      metadata.checkoutSessionId ||
      null;

    const subscriptionId =
      metadata.subscriptionId ||
      metadata.subscription_id ||
      null;

    const chargeId =
      charge?.id || null;

    const chargeStatus =
      charge?.status || null;

    console.log(
      "[YABETOO WEBHOOK] Paiement:",
      JSON.stringify(
        {
          event,
          webhookId,
          intentId,
          intentStatus,
          amount,
          currency,
          restaurantId,
          checkoutSessionId,
          subscriptionId,
          chargeId,
          chargeStatus,
        },
        null,
        2
      )
    );

    // -----------------------------------------------------
    // 10. ÉVÉNEMENTS NON SUCCÈS
    // -----------------------------------------------------

    if (event !== "intent.succeeded") {
      console.log(
        "[YABETOO WEBHOOK] Événement vérifié mais non traité:",
        event
      );

      return res.status(200).json({
        received: true,
        verified: true,
        event,
        handled: false,
      });
    }

    // -----------------------------------------------------
    // 11. VALIDATION DONNÉES PAIEMENT
    // -----------------------------------------------------

    if (!intentId) {
      console.error(
        "[YABETOO WEBHOOK] intent.id manquant."
      );

      return res.status(400).json({
        error: "Identifiant du paiement manquant.",
      });
    }

    if (!restaurantId) {
      console.error(
        "[YABETOO WEBHOOK] restaurant_id manquant dans metadata."
      );

      return res.status(400).json({
        error: "restaurant_id manquant.",
      });
    }

    // -----------------------------------------------------
    // 12. VALIDATION MONTANT
    // -----------------------------------------------------

    if (amount !== PRO_PRICE) {
      console.error(
        "[YABETOO WEBHOOK] Montant inattendu:",
        amount
      );

      return res.status(400).json({
        error: "Montant du paiement invalide.",
      });
    }

    // -----------------------------------------------------
    // 13. VALIDATION DEVISE
    // -----------------------------------------------------

    if (currency !== "xaf") {
      console.error(
        "[YABETOO WEBHOOK] Devise inattendue:",
        currency
      );

      return res.status(400).json({
        error: "Devise du paiement invalide.",
      });
    }

    // -----------------------------------------------------
    // 14. CLIENT SUPABASE ADMIN
    // -----------------------------------------------------

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // -----------------------------------------------------
    // 15. RETROUVER LE PAIEMENT
    // -----------------------------------------------------
    //
    // create-checkout-session.js enregistre :
    //
    // transaction_id = sessionId
    //
    // On utilise donc checkoutSessionId.
    //
    // Si Yabetoo ne renvoie pas checkout_session_id,
    // on utilise éventuellement metadata/session correspondante.

    let paymentQuery = supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("provider", PROVIDER)
      .eq("amount", PRO_PRICE)
      .eq("status", "pending");

    if (checkoutSessionId) {
      paymentQuery = paymentQuery.eq(
        "transaction_id",
        checkoutSessionId
      );
    }

    const {
      data: payment,
      error: paymentFindError,
    } = await paymentQuery
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (paymentFindError) {
      console.error(
        "[YABETOO WEBHOOK] Erreur recherche paiement:",
        paymentFindError
      );

      return res.status(500).json({
        error: "Impossible de retrouver le paiement.",
      });
    }

    if (!payment) {
      // ---------------------------------------------------
      // Le paiement peut déjà avoir été traité.
      // On recherche donc une transaction déjà réussie.
      // ---------------------------------------------------

      const {
        data: alreadyProcessed,
        error: alreadyProcessedError,
      } = await supabaseAdmin
        .from("subscription_payments")
        .select(
          "id, restaurant_id, transaction_id, status"
        )
        .eq("restaurant_id", restaurantId)
        .eq("provider", PROVIDER)
        .eq("amount", PRO_PRICE)
        .eq("status", "succeeded")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (alreadyProcessedError) {
        console.error(
          "[YABETOO WEBHOOK] Erreur vérification idempotence:",
          alreadyProcessedError
        );

        return res.status(500).json({
          error: "Erreur lors de la vérification du paiement.",
        });
      }

      if (alreadyProcessed) {
        console.log(
          "[YABETOO WEBHOOK] Paiement déjà traité."
        );

        return res.status(200).json({
          received: true,
          verified: true,
          alreadyProcessed: true,
          paymentId: alreadyProcessed.id,
        });
      }

      console.error(
        "[YABETOO WEBHOOK] Aucun paiement pending correspondant."
      );

      return res.status(404).json({
        error: "Paiement pending introuvable.",
      });
    }

    // -----------------------------------------------------
    // 16. RETROUVER LE RESTAURANT
    // -----------------------------------------------------

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, owner_id, plan, subscription_status, next_billing_date"
      )
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "[YABETOO WEBHOOK] Erreur restaurant:",
        restaurantError
      );

      return res.status(500).json({
        error: "Impossible de retrouver le restaurant.",
      });
    }

    if (!restaurant) {
      console.error(
        "[YABETOO WEBHOOK] Restaurant introuvable:",
        restaurantId
      );

      return res.status(404).json({
        error: "Restaurant introuvable.",
      });
    }

    // -----------------------------------------------------
    // 17. CALCUL PÉRIODE D'ABONNEMENT
    // -----------------------------------------------------

    const billingStart = new Date();

    const billingEnd = addOneMonth(
      billingStart
    );

    // -----------------------------------------------------
    // 18. MISE À JOUR DU PAIEMENT
    // -----------------------------------------------------

    const {
      data: updatedPayment,
      error: paymentUpdateError,
    } = await supabaseAdmin
      .from("subscription_payments")
      .update({
        status: "succeeded",
        billing_period_start:
          billingStart.toISOString(),
        billing_period_end:
          billingEnd.toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (paymentUpdateError) {
      console.error(
        "[YABETOO WEBHOOK] Erreur mise à jour paiement:",
        paymentUpdateError
      );

      return res.status(500).json({
        error: "Impossible de confirmer le paiement.",
      });
    }

    // -----------------------------------------------------
    // 19. PROTECTION CONTRE DOUBLE TRAITEMENT
    // -----------------------------------------------------

    if (!updatedPayment) {
      console.log(
        "[YABETOO WEBHOOK] Paiement déjà traité par une autre requête."
      );

      return res.status(200).json({
        received: true,
        verified: true,
        alreadyProcessed: true,
      });
    }

    // -----------------------------------------------------
    // 20. ACTIVATION DU RESTAURANT
    // -----------------------------------------------------

    const previousStatus =
      restaurant.subscription_status;

    const {
      error: restaurantUpdateError,
    } = await supabaseAdmin
      .from("restaurants")
      .update({
        plan: PRO_PLAN,
        subscription_status: "active",
        next_billing_date:
          billingEnd.toISOString(),
      })
      .eq("id", restaurant.id);

    if (restaurantUpdateError) {
      console.error(
        "[YABETOO WEBHOOK] Erreur activation restaurant:",
        restaurantUpdateError
      );

      // Le paiement est déjà marqué succeeded.
      // On retourne 500 afin que Yabetoo puisse éventuellement
      // retenter le webhook.

      return res.status(500).json({
        error:
          "Paiement confirmé mais activation du restaurant échouée.",
      });
    }

    // -----------------------------------------------------
    // 21. HISTORIQUE ABONNEMENT
    // -----------------------------------------------------

    const {
      error: eventInsertError,
    } = await supabaseAdmin
      .from("subscription_events")
      .insert({
        restaurant_id: restaurant.id,
        previous_status: previousStatus,
        new_status: "active",
        triggered_by: "yabetoo_webhook",
        reason:
          "Paiement Yabetoo PRO confirmé",
        actor_id: restaurant.owner_id || null,
      });

    if (eventInsertError) {
      console.error(
        "[YABETOO WEBHOOK] Erreur historique abonnement:",
        eventInsertError
      );

      // Le paiement et l'abonnement sont déjà activés.
      // On ne doit PAS annuler le paiement à cause de
      // l'échec de l'historique.

      return res.status(200).json({
        received: true,
        verified: true,
        processed: true,
        warning:
          "Paiement et abonnement activés, mais historique non enregistré.",
        paymentId: updatedPayment.id,
        restaurantId: restaurant.id,
      });
    }

    // -----------------------------------------------------
    // 22. SUCCÈS FINAL
    // -----------------------------------------------------

    console.log(
      "[YABETOO WEBHOOK] ✅ PAIEMENT TRAITÉ AVEC SUCCÈS"
    );

    console.log(
      "[YABETOO WEBHOOK] Restaurant activé:",
      restaurant.id
    );

    console.log(
      "[YABETOO WEBHOOK] Prochaine échéance:",
      billingEnd.toISOString()
    );

    return res.status(200).json({
      received: true,
      verified: true,
      processed: true,

      event,

      webhookId,

      payment: {
        id: updatedPayment.id,
        intentId,
        checkoutSessionId,
        amount,
        currency,
        status: "succeeded",
      },

      subscription: {
        restaurantId: restaurant.id,
        plan: PRO_PLAN,
        previousStatus,
        status: "active",
        billingPeriodStart:
          billingStart.toISOString(),
        billingPeriodEnd:
          billingEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "[YABETOO WEBHOOK] ERREUR SERVEUR:",
      error
    );

    return res.status(500).json({
      error: "Erreur interne du webhook Yabetoo.",
    });
  }
}
```
