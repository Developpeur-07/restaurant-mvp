// api/webhooks/yabetoo-debug.js
//
// ⚠️ RECONNAISSANCE TEMPORAIRE — pas destiné à rester en prod tel quel.
// But : recevoir un vrai événement webhook de Yabetoo et logger sa structure
// complète (nom d'événement, forme du payload, présence de l'ID de session),
// avant d'écrire le handler définitif. Répond toujours 200 pour éviter que
// Yabetoo ne retente en boucle pendant qu'on observe.
//
// Configuration requise côté dashboard Yabetoo (Développeurs > Webhooks) :
// URL = https://<ton-domaine-vercel>.app/api/webhooks/yabetoo-debug
//
// Vercel ne parse PAS automatiquement le body en JSON par défaut sur les
// fonctions serverless "brutes" (hors Next.js) — on lit le flux manuellement
// pour avoir accès au corps brut, nécessaire à la vérification de signature.

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée — un webhook doit être en POST' });
  }

  const rawBody = await getRawBody(req);

  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = { unparsable_raw_body: rawBody };
  }

  const headersOfInterest = {
    'x-yabetoo-webhook-signature': req.headers['x-yabetoo-webhook-signature'],
    'x-yabetoo-webhook-timestamp': req.headers['x-yabetoo-webhook-timestamp'],
    'x-yabetoo-webhook-event': req.headers['x-yabetoo-webhook-event'],
    'x-yabetoo-webhook-id': req.headers['x-yabetoo-webhook-id'],
  };

  // ── Log complet — visible dans Vercel > Deployments > Functions > Logs ──
  console.log('========== WEBHOOK YABETOO REÇU ==========');
  console.log('[YABETOO WEBHOOK] En-têtes pertinents:', JSON.stringify(headersOfInterest, null, 2));
  console.log('[YABETOO WEBHOOK] Tous les en-têtes:', JSON.stringify(req.headers, null, 2));
  console.log('[YABETOO WEBHOOK] Corps brut (raw):', rawBody);
  console.log('[YABETOO WEBHOOK] Corps parsé:', JSON.stringify(parsedBody, null, 2));
  console.log('===========================================');

  // Toujours répondre 200 pendant la phase de reconnaissance — on ne veut
  // pas déclencher de retries automatiques de Yabetoo pendant qu'on observe.
  return res.status(200).json({ received: true, debug: true });
}