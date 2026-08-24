// lib/yabetooWebhook.js
//
// Vérification partagée des webhooks Yabetoo (signature HMAC-SHA256 + timestamp).
//
// Utilisé par api/webhooks/yabetoo-order-payment.js (paiement commande).
// api/webhooks/yabetoo-debug.js (abonnement) n'a volontairement pas été
// touché — il reste autonome pour ne pas risquer de casser un chemin déjà
// testé et en production. Une migration de yabetoo-debug.js vers ce module
// peut être faite plus tard, séparément, une fois ce fichier lui-même
// éprouvé en conditions réelles.
//
// Ce module ne contient AUCUNE logique métier — uniquement la vérification
// cryptographique et le parsing du payload JSON. La logique métier
// (recherche de paiement, mise à jour de statuts, etc.) reste dans chaque
// webhook appelant.

import crypto from "crypto";
import Buffer from "buffer";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export async function getRawBody(req) {
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

function calculateSignature(timestamp, rawBody, secret) {
  const signedPayload = `${timestamp}.${rawBody}`;

  return crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

// Vérifie méthode HTTP, présence du body, signature HMAC, fraîcheur du
// timestamp, puis parse le JSON.
//
// Retourne :
//   { ok: true, payload, event, webhookId, rawBody }
// ou :
//   { ok: false, status, error } — prêt à passer directement à
//   res.status(status).json({ error }).
export async function verifyYabetooWebhook(req, secret) {
  if (req.method !== "POST") {
    return {
      ok: false,
      status: 405,
      error: "Méthode non autorisée. Le webhook doit être en POST.",
    };
  }

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "Configuration webhook manquante.",
    };
  }

  const rawBody = await getRawBody(req);

  if (!rawBody) {
    return {
      ok: false,
      status: 400,
      error: "Body webhook vide.",
    };
  }

  const signature = req.headers["x-yabetoo-webhook-signature"];
  const timestamp = req.headers["x-yabetoo-webhook-timestamp"];
  const event = req.headers["x-yabetoo-webhook-event"];
  const webhookId = req.headers["x-yabetoo-webhook-id"];

  if (!signature || !timestamp) {
    return {
      ok: false,
      status: 401,
      error: "Signature webhook manquante.",
    };
  }

  const timestampSeconds = Number(timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    return {
      ok: false,
      status: 401,
      error: "Timestamp webhook invalide.",
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return {
      ok: false,
      status: 401,
      error: "Timestamp webhook expiré.",
    };
  }

  const expectedSignature = calculateSignature(timestamp, rawBody, secret);
  const signatureValid = timingSafeEqualHex(signature, expectedSignature);

  if (!signatureValid) {
    return {
      ok: false,
      status: 401,
      error: "Signature webhook invalide.",
    };
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch{
    return {
      ok: false,
      status: 400,
      error: "Payload JSON invalide.",
    };
  }

  return {
    ok: true,
    payload,
    event,
    webhookId,
    rawBody,
  };
}