// api/webhooks/yabetoo-subscription.js
//
// Webhook officiel Yabetoo pour l'activation d'abonnement SaaS (PRO).
//
// Rôle :
// 1. Vérifier la signature HMAC-SHA256 et la fraîcheur du timestamp.
// 2. Traiter uniquement l'événement `intent.succeeded`.
// 3. Extraire le restaurant_id depuis les métadonnées et retrouver la transaction pending.
// 4. Passer subscription_payments -> succeeded.
// 5. Mettre à jour le restaurant -> subscription_status = 'active', plan = 'pro', next_billing_date = +1 mois.
// 6. Enregistrer l'événement d'audit dans subscription_events (triggered_by = 'webhook').
//

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const PRO_PLAN = "pro";
const PROVIDER = "yabetoo";
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function timingSafeEqualHex(a, b) {
  if (!a || !b) return false;
  try {
    const aBuffer = Buffer.from(a, "hex");
    const bBuffer = Buffer.from(b, "hex");
    if (aBuffer.length !== bBuffer.length) return false;
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

function calculateSignature(timestamp, rawBody, secret) {
  const signedPayload = `${timestamp}.${rawBody}`;
  return crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
}

function addOneMonth(date) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. POST requis." });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[YABETOO SUBSCRIPTION WEBHOOK] Configuration Supabase manquante.");
    return res.status(500).json({ error: "Configuration Supabase serveur manquante." });
  }

  const webhookSecret = process.env.YABETOO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[YABETOO SUBSCRIPTION WEBHOOK] YABETOO_WEBHOOK_SECRET manquant.");
    return res.status(500).json({ error: "Configuration webhook manquante." });
  }

  try {
    const rawBody = await getRawBody(req);
    if (!rawBody) {
      return res.status(400).json({ error: "Body webhook vide." });
    }

    const signature = req.headers["x-yabetoo-webhook-signature"];
    const timestamp = req.headers["x-yabetoo-webhook-timestamp"];
    const event = req.headers["x-yabetoo-webhook-event"];
    const webhookId = req.headers["x-yabetoo-webhook-id"];

    console.log("========== WEBHOOK YABETOO SUBSCRIPTION ==========");
    console.log("[YABETOO SUBSCRIPTION WEBHOOK] Event:", event);
    console.log("[YABETOO SUBSCRIPTION WEBHOOK] ID:", webhookId);

    if (!signature || !timestamp) {
      return res.status(401).json({ error: "Signature ou timestamp manquant." });
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      return res.status(401).json({ error: "Timestamp invalide." });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
      return res.status(401).json({ error: "Timestamp expiré." });
    }

    const expectedSignature = calculateSignature(timestamp, rawBody, webhookSecret);
    if (!timingSafeEqualHex(signature, expectedSignature)) {
      console.error("[YABETOO SUBSCRIPTION WEBHOOK] Signature HMAC invalide.");
      return res.status(401).json({ error: "Signature webhook invalide." });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Payload JSON invalide." });
    }

    const intent = payload?.data?.intent;
    const intentId = intent?.id || null;
    const amount = Number(intent?.amount || 0);
    const currency = String(intent?.currency || "").toLowerCase();
    const metadata = intent?.metadata || {};

    const restaurantId = metadata.restaurant_id || null;
    const checkoutSessionId =
      metadata.checkout_session_id || metadata.checkoutSessionId || metadata.session_id || null;

    console.log("[YABETOO SUBSCRIPTION WEBHOOK] Intent:", { intentId, amount, currency, restaurantId });

    if (event !== "intent.succeeded") {
      console.log("[YABETOO SUBSCRIPTION WEBHOOK] Événement ignoré:", event);
      return res.status(200).json({ received: true, verified: true, event, handled: false });
    }

    if (!restaurantId) {
      console.error("[YABETOO SUBSCRIPTION WEBHOOK] restaurant_id manquant dans les métadonnées.");
      return res.status(400).json({ error: "restaurant_id manquant dans metadata." });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Recherche du paiement pending
    let query = supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("provider", PROVIDER)
      .eq("status", "pending");

    if (checkoutSessionId) {
      query = query.eq("transaction_id", checkoutSessionId);
    }

    const { data: payment, error: paymentError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error("[YABETOO SUBSCRIPTION WEBHOOK] Erreur lecture subscription_payments:", paymentError);
      return res.status(500).json({ error: "Erreur recherche paiement." });
    }

    if (!payment) {
      // Vérifier si la transaction n'a pas déjà été marquée succeeded
      const { data: alreadyDone } = await supabaseAdmin
        .from("subscription_payments")
        .select("id, status")
        .eq("restaurant_id", restaurantId)
        .eq("provider", PROVIDER)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (alreadyDone) {
        console.log("[YABETOO SUBSCRIPTION WEBHOOK] Paiement déjà traité avec succès.");
        return res.status(200).json({ received: true, verified: true, alreadyProcessed: true });
      }

      // Si aucun pending n'a été trouvé, on continue avec la création directe du paiement
      console.warn("[YABETOO SUBSCRIPTION WEBHOOK] Aucun paiement pending trouvé pour restaurant, création directe en succeeded:", restaurantId);
    }

    // 2. Recherche du restaurant
    const { data: restaurant, error: restoFetchError } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_id, subscription_status")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restoFetchError || !restaurant) {
      console.error("[YABETOO SUBSCRIPTION WEBHOOK] Restaurant introuvable:", restaurantId);
      return res.status(404).json({ error: "Restaurant introuvable." });
    }

    const billingStart = new Date();
    const billingEnd = addOneMonth(billingStart);

    // 3. Mise à jour ou insertion subscription_payments -> succeeded
    if (payment) {
      const { data: updatedPayment, error: paymentUpdateError } = await supabaseAdmin
        .from("subscription_payments")
        .update({
          status: "succeeded",
          billing_period_start: billingStart.toISOString(),
          billing_period_end: billingEnd.toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (paymentUpdateError || !updatedPayment) {
        console.log("[YABETOO SUBSCRIPTION WEBHOOK] Paiement déjà traité ou échec mise à jour.");
        return res.status(200).json({ received: true, verified: true, alreadyProcessed: true });
      }
    } else {
      await supabaseAdmin
        .from("subscription_payments")
        .insert({
          restaurant_id: restaurant.id,
          amount: amount || PRO_PRICE,
          provider: PROVIDER,
          transaction_id: checkoutSessionId || `sub_${Date.now()}`,
          status: "succeeded",
          billing_period_start: billingStart.toISOString(),
          billing_period_end: billingEnd.toISOString(),
        });
    }

    // 4. Activation du restaurant
    const previousStatus = restaurant.subscription_status;

    const { error: restoUpdateError } = await supabaseAdmin
      .from("restaurants")
      .update({
        plan: PRO_PLAN,
        subscription_status: "active",
        next_billing_date: billingEnd.toISOString(),
      })
      .eq("id", restaurant.id);

    if (restoUpdateError) {
      console.error("[YABETOO SUBSCRIPTION WEBHOOK] Erreur activation restaurant:", restoUpdateError);
      return res.status(500).json({ error: "Paiement validé mais échec activation restaurant." });
    }

    // 5. Audit trail subscription_events
    await supabaseAdmin.from("subscription_events").insert({
      restaurant_id: restaurant.id,
      previous_status: previousStatus,
      new_status: "active",
      triggered_by: "webhook",
      reason: `Paiement Yabetoo PRO confirmé (${intentId || payment.transaction_id})`,
      actor_id: restaurant.owner_id || null,
    });

    console.log("[YABETOO SUBSCRIPTION WEBHOOK] ✅ RESTAURANT ACTIVÉ AVEC SUCCÈS:", restaurant.id);

    return res.status(200).json({
      received: true,
      verified: true,
      processed: true,
      paymentId: updatedPayment.id,
      restaurantId: restaurant.id,
      status: "active",
      nextBillingDate: billingEnd.toISOString(),
    });
  } catch (error) {
    console.error("[YABETOO SUBSCRIPTION WEBHOOK] ERREUR SERVEUR:", error);
    return res.status(500).json({ error: "Erreur interne webhook Yabetoo." });
  }
}
