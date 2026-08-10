// api/check-test-session.js
//
// ⚠️ RECONNAISSANCE TEMPORAIRE — pas destiné à rester en prod tel quel.
// But : interroger l'API Yabetoo pour connaître le statut RÉEL d'une session
// déjà créée (GET /v1/sessions/:id), confirmé disponible via le SDK Java
// (yabetoo.sessions().retrieve("cs_...")). Sert de filet de sécurité en
// réconciliation, indépendant du webhook — même logique que check-trials.js
// qui revérifie subscription_payments en dernier ressort avant de suspendre.
//
// Usage : GET /api/check-test-session?sessionId=cs_XXXXXXXXXXXX

const YABETOO_API_URL = "https://buy.api.yabetoopay.com/v1/sessions";

export default async function handler(req, res) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res
      .status(400)
      .json({
        error: "Paramètre sessionId requis. Ex: ?sessionId=cs_XXXXXXXXXXXX",
      });
  }
  console.log(
    "[YABETOO CHECK SESSION] Secret présent:",
    Boolean(process.env.YABETOO_SECRET_KEY),
  );

  console.log(
    "[YABETOO CHECK SESSION] Secret commence par:",
    process.env.YABETOO_SECRET_KEY?.slice(0, 8),
  );

  console.log(
    "[YABETOO CHECK SESSION] Account ID présent:",
    Boolean(process.env.YABETOO_ACCOUNT_ID),
  );
  try {
    const response = await fetch(`${YABETOO_API_URL}/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.YABETOO_SECRET_KEY}`,
      },
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { unparsable_raw_response: raw };
    }

    console.log("[YABETOO CHECK SESSION] Status HTTP:", response.status);
    console.log(
      "[YABETOO CHECK SESSION] Réponse complète:",
      JSON.stringify(data, null, 2),
    );

    return res.status(200).json({
      note: "Réponse brute GET /v1/sessions/:id — vérifie payment_status après paiement sandbox.",
      httpStatus: response.status,
      paymentStatus:
        data?.payment_status ||
        "⚠️ Champ payment_status introuvable — voir reponseYabetoo ci-dessous",
      reponseYabetoo: data,
    });
  } catch (error) {
    console.error("[YABETOO CHECK SESSION] Erreur:", error);
    return res.status(500).json({ error: error.message });
  }
}
