// api/webhooks/yabetoo-order.js
//
// Webhook Yabetoo pour la confirmation des paiements de commandes client final (order_type = 'emporter').
//

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. POST requis." });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[YABETOO ORDER WEBHOOK] Configuration Supabase manquante.");
    return res.status(500).json({ error: "Configuration Supabase serveur manquante." });
  }

  const webhookSecret = process.env.YABETOO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[YABETOO ORDER WEBHOOK] YABETOO_WEBHOOK_SECRET manquant.");
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

    console.log("========== WEBHOOK YABETOO ORDER ==========");
    console.log("[YABETOO ORDER WEBHOOK] Event:", event);
    console.log("[YABETOO ORDER WEBHOOK] ID:", webhookId);

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
      console.error("[YABETOO ORDER WEBHOOK] Signature HMAC invalide.");
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
    const metadata = intent?.metadata || {};

    const orderId = metadata.order_id || null;
    const restaurantId = metadata.restaurant_id || null;

    console.log("[YABETOO ORDER WEBHOOK] Metadata reçues:", { orderId, restaurantId, intentId, amount });

    if (event !== "intent.succeeded") {
      console.log("[YABETOO ORDER WEBHOOK] Événement ignoré:", event);
      return res.status(200).json({ received: true, verified: true, event, handled: false });
    }

    if (!orderId) {
      console.error("[YABETOO ORDER WEBHOOK] order_id manquant dans metadata.");
      return res.status(400).json({ error: "order_id manquant dans metadata." });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Recherche du paiement de la commande
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .eq("provider", PROVIDER)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error("[YABETOO ORDER WEBHOOK] Erreur recherche paiement:", paymentError);
      return res.status(500).json({ error: "Erreur recherche paiement." });
    }

    if (!payment) {
      // Vérifier si le paiement est déjà validé
      const { data: alreadyDone } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("order_id", orderId)
        .eq("status", "succeeded")
        .limit(1)
        .maybeSingle();

      if (alreadyDone) {
        console.log("[YABETOO ORDER WEBHOOK] Commande déjà marquée payée.");
        return res.status(200).json({ received: true, verified: true, alreadyProcessed: true });
      }

      console.error("[YABETOO ORDER WEBHOOK] Aucun paiement pending trouvé pour order:", orderId);
      return res.status(404).json({ error: "Paiement commande en attente introuvable." });
    }

    // 2. Mise à jour de payments -> succeeded
    const { data: updatedPayment, error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "succeeded",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (paymentUpdateError || !updatedPayment) {
      console.log("[YABETOO ORDER WEBHOOK] Paiement commande déjà confirmé.");
      return res.status(200).json({ received: true, verified: true, alreadyProcessed: true });
    }

    // 3. Mise à jour de orders -> status = 'paid' (ou transition statut)
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("[YABETOO ORDER WEBHOOK] Erreur mise à jour commande:", orderUpdateError);
      return res.status(500).json({ error: "Paiement enregistré mais échec mise à jour commande." });
    }

    console.log("[YABETOO ORDER WEBHOOK] ✅ COMMANDE CONFIRMÉE PAYÉE:", orderId);

    return res.status(200).json({
      received: true,
      verified: true,
      processed: true,
      orderId,
      paymentId: updatedPayment.id,
      amount,
    });
  } catch (error) {
    console.error("[YABETOO ORDER WEBHOOK] ERREUR SERVEUR:", error);
    return res.status(500).json({ error: "Erreur interne webhook commande Yabetoo." });
  }
}
