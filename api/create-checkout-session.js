// api/create-checkout-session.js
//
// ⚠️ RECONNAISSANCE TEMPORAIRE — pas destiné à rester en prod tel quel.
// But : créer une session de paiement Yabetoo fraîche avec les identifiants
// actuellement configurés sur Vercel (YABETOO_SECRET_KEY + YABETOO_ACCOUNT_ID),
// pour éliminer l'hypothèse "session orpheline créée avec une autre clé".
// Référence doc : POST https://buy.api.yabetoopay.com/v1/sessions
//
// Usage : GET /api/create-checkout-session (déclenche une création avec des
// valeurs de test en dur — à passer en POST + paramètres réels une fois validé)

const YABETOO_SESSIONS_URL = "https://buy.api.yabetoopay.com/v1/sessions";

export default async function handler(req, res) {
  console.log(
    "[YABETOO CREATE SESSION] Secret présent:",
    Boolean(process.env.YABETOO_SECRET_KEY),
  );
  console.log(
    "[YABETOO CREATE SESSION] Secret commence par:",
    process.env.YABETOO_SECRET_KEY?.slice(0, 8),
  );
  console.log(
    "[YABETOO CREATE SESSION] Account ID présent:",
    Boolean(process.env.YABETOO_ACCOUNT_ID),
  );
  console.log(
    "[YABETOO CREATE SESSION] Account ID valeur:",
    process.env.YABETOO_ACCOUNT_ID,
  );

  if (!process.env.YABETOO_SECRET_KEY || !process.env.YABETOO_ACCOUNT_ID) {
    return res.status(500).json({
      error:
        "YABETOO_SECRET_KEY ou YABETOO_ACCOUNT_ID manquant dans les variables d'environnement Vercel.",
    });
  }

  try {
    const response = await fetch(YABETOO_SESSIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.YABETOO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        total: 35000,
        currency: "xaf",
        accountId: process.env.YABETOO_ACCOUNT_ID,
        successUrl: "https://votre-site.com/succes",
        cancelUrl: "https://votre-site.com/annuler",
        items: [
          {
            productId: "prod_test_abonnement",
            productName: "Test abonnement Le Resto-HUB",
            quantity: 1,
            price: 35000,
          },
        ],
      }),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { unparsable_raw_response: raw };
    }

    console.log("[YABETOO CREATE SESSION] Status HTTP:", response.status);
    console.log(
      "[YABETOO CREATE SESSION] Réponse complète:",
      JSON.stringify(data, null, 2),
    );

    return res.status(200).json({
      note: "Réponse brute POST /v1/sessions — si succès, tester ensuite avec check-test-session.js?sessionId=<id retourné>",
      httpStatus: response.status,
      sessionId: data?.id || null,
      checkoutUrl: data?.url || null,
      reponseYabetoo: data,
    });
  } catch (error) {
    console.error("[YABETOO CREATE SESSION] Erreur:", error);
    return res.status(500).json({ error: error.message });
  }
}