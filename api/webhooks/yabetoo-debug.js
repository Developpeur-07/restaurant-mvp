// api/webhooks/yabetoo-debug.js
//
// Webhook Yabetoo sécurisé
// - Lit le body brut
// - Vérifie la signature HMAC-SHA256
// - Vérifie le timestamp
// - Parse le payload JSON
// - Traite intent.succeeded
//
// Variable Vercel requise :
// YABETOO_WEBHOOK_SECRET=whsec_...

import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function timingSafeEqualHex(a, b) {
  if (!a || !b) {
    return false;
  }

  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function calculateSignature(timestamp, rawBody, secret) {
  const signedPayload = `${timestamp}.${rawBody}`;

  return crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

export default async function handler(req, res) {
  // ---------------------------------------------------------
  // 1. Vérification de la méthode HTTP
  // ---------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée. Le webhook doit être en POST.",
    });
  }

  // ---------------------------------------------------------
  // 2. Vérification de la configuration
  // ---------------------------------------------------------

  const webhookSecret = process.env.YABETOO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[YABETOO WEBHOOK] YABETOO_WEBHOOK_SECRET manquante."
    );

    return res.status(500).json({
      error: "Configuration webhook manquante.",
    });
  }

  // ---------------------------------------------------------
  // 3. Lecture du body BRUT
  // ---------------------------------------------------------

  const rawBody = await getRawBody(req);

  // ---------------------------------------------------------
  // 4. Récupération des headers Yabetoo
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 5. Vérification présence signature/timestamp
  // ---------------------------------------------------------

  if (!signature || !timestamp) {
    console.error(
      "[YABETOO WEBHOOK] Signature ou timestamp manquant."
    );

    return res.status(401).json({
      error: "Signature webhook manquante.",
    });
  }

  // ---------------------------------------------------------
  // 6. Vérification du timestamp
  // ---------------------------------------------------------

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

  // Tolérance de 5 minutes
  const tolerance = 5 * 60;

  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    console.error(
      "[YABETOO WEBHOOK] Timestamp trop ancien ou trop éloigné."
    );

    return res.status(401).json({
      error: "Timestamp webhook expiré.",
    });
  }

  // ---------------------------------------------------------
  // 7. Calcul de la signature attendue
  // ---------------------------------------------------------

  const expectedSignature = calculateSignature(
    timestamp,
    rawBody,
    webhookSecret
  );

  // ---------------------------------------------------------
  // 8. Comparaison sécurisée des signatures
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 9. Parsing du JSON
  // ---------------------------------------------------------

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error(
      "[YABETOO WEBHOOK] Payload JSON invalide:",
      error.message
    );

    return res.status(400).json({
      error: "Payload JSON invalide.",
    });
  }

  // ---------------------------------------------------------
  // 10. Extraction des données utiles
  // ---------------------------------------------------------

  const intent = payload?.data?.intent;
  const charge = payload?.data?.charge;

  const checkoutSessionId =
    intent?.metadata?.checkout_session_id || null;

  const subscriptionId =
    intent?.metadata?.subscriptionId || null;

  console.log(
    "[YABETOO WEBHOOK] Paiement vérifié:",
    JSON.stringify(
      {
        intentId: intent?.id || null,
        intentStatus: intent?.status || null,
        amount: intent?.amount || null,
        currency: intent?.currency || null,
        checkoutSessionId,
        subscriptionId,
        chargeId: charge?.id || null,
        chargeStatus: charge?.status || null,
      },
      null,
      2
    )
  );

  // ---------------------------------------------------------
  // 11. Traitement du paiement réussi
  // ---------------------------------------------------------

  if (event === "intent.succeeded") {
    console.log(
      "[YABETOO WEBHOOK] ✅ PAIEMENT RÉUSSI ET SIGNATURE VALIDÉE"
    );

    return res.status(200).json({
      received: true,
      verified: true,
      event,
      webhookId,
      payment: {
        intentId: intent?.id || null,
        checkoutSessionId,
        subscriptionId,
        amount: intent?.amount || null,
        currency: intent?.currency || null,
        chargeId: charge?.id || null,
      },
    });
  }

  // ---------------------------------------------------------
  // 12. Autres événements
  // ---------------------------------------------------------

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