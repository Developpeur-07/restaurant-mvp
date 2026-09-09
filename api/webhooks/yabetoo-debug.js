// api/webhooks/yabetoo-debug.js
//
// Webhook Yabetoo — Route legacy (rétrocompatibilité).
// Transfère la requête directement vers yabetoo-subscription.js.
//

import subscriptionHandler, { config as subscriptionConfig } from "./yabetoo-subscription.js";

export const config = subscriptionConfig;

export default async function handler(req, res) {
  console.log("[YABETOO DEBUG WEBHOOK] Redirection vers yabetoo-subscription...");
  return subscriptionHandler(req, res);
}