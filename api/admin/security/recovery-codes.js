// api/admin/security/recovery-codes.js
//
// Codes de secours de la double authentification (2FA).
//
// Pourquoi : si le téléphone qui héberge Google Authenticator est perdu, cassé
// ou volé, l'administrateur perd l'accès à son espace. Les codes de secours
// sont l'issue de secours — à usage unique, générés une seule fois, stockés
// hashés (scrypt) dans une table qu'aucun client ne peut lire.
//
// GET  /api/admin/security/recovery-codes
//      -> { total, remaining }
//
// POST /api/admin/security/recovery-codes
//      { action: "generate" | "regenerate" }  -> { codes: [...] }  (affichés
//        UNE seule fois, jamais récupérables ensuite). Exige une session aal2
//        ET un facteur TOTP déjà vérifié.
//      { action: "redeem", code }             -> consomme le code, supprime les
//        facteurs TOTP du compte pour permettre une ré-inscription.
//      { action: "clear" }                    -> purge les codes (2FA désactivée).
//
// Sécurité : toute l'opération se fait côté serveur. Le navigateur n'a aucun
// moyen de lire, modifier ou deviner un code.

import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  authenticate,
  requireAal2IfEnrolled,
  hasVerifiedFactor,
  enforceRateLimit,
  writeAuditLog,
} from "../../_lib/admin-auth.js";

const scryptAsync = promisify(scrypt);

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) : un code recopié à la
// main sur un autre téléphone doit rester lisible.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;
const CODES_PER_SET = 10;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

function generatePlainCode() {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Présentation lisible : ABCD-EFGH-JKLM */
function formatCode(code) {
  return (code.match(/.{1,4}/g) || [code]).join("-");
}

/** Normalise une saisie utilisateur (espaces, tirets, casse). */
function normalizeCode(input) {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function hashCode(code) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(code, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function verifyCode(code, stored) {
  try {
    const [, saltB64, hashB64] = String(stored).split("$");
    if (!saltB64 || !hashB64) return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = await scryptAsync(code, salt, expected.length, {
      N: SCRYPT.N,
      r: SCRYPT.r,
      p: SCRYPT.p,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const auth = await authenticate(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    if (req.method === "GET") return await getStatus(res, auth);

    const body = req.body || {};
    switch (body.action) {
      case "generate":
      case "regenerate":
        return await generateCodes(res, auth);
      case "redeem":
        return await redeemCode(res, auth, body.code);
      case "clear":
        return await clearCodes(res, auth);
      default:
        return res.status(400).json({ error: "Action inconnue." });
    }
  } catch (error) {
    console.error("[RECOVERY CODES] Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur interne." });
  }
}

async function getStatus(res, auth) {
  const { count: total } = await auth.client
    .from("admin_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id);

  const { count: used } = await auth.client
    .from("admin_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .not("used_at", "is", null);

  const t = total || 0;
  const u = used || 0;
  return res.status(200).json({ total: t, remaining: Math.max(0, t - u) });
}

async function generateCodes(res, auth) {
  // Générer des codes de secours est une action sensible : 2FA exigée.
  const mfa = await requireAal2IfEnrolled(auth);
  if (!mfa.ok) return res.status(mfa.status).json({ error: mfa.error, code: mfa.code });

  // Un code de secours ne peut pas être le SEUL facteur : il faut déjà un TOTP.
  if (!(await hasVerifiedFactor(auth.client, auth.user.id))) {
    return res.status(400).json({
      error: "Active d'abord l'application d'authentification avant de créer des codes de secours.",
    });
  }

  const limit = await enforceRateLimit(auth, "generate_recovery_codes", 10);
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error });

  const plainCodes = Array.from({ length: CODES_PER_SET }, generatePlainCode);

  // On remplace l'ancienne série : les codes restants deviennent invalides
  // immédiatement, ce qui est le comportement attendu d'une régénération.
  const { error: deleteError } = await auth.client
    .from("admin_recovery_codes")
    .delete()
    .eq("user_id", auth.user.id);

  if (deleteError) {
    console.error("[RECOVERY CODES] Purge:", deleteError);
    return res.status(500).json({ error: "Purge de l'ancienne série impossible." });
  }

  const rows = [];
  for (const plain of plainCodes) {
    rows.push({ user_id: auth.user.id, code_hash: await hashCode(plain) });
  }

  const { error: insertError } = await auth.client.from("admin_recovery_codes").insert(rows);
  if (insertError) {
    console.error("[RECOVERY CODES] Insertion:", insertError);
    return res.status(500).json({ error: "Enregistrement des codes impossible." });
  }

  await writeAuditLog(auth, {
    action: "generate_recovery_codes",
    targetUserId: auth.user.id,
    metadata: { count: plainCodes.length },
  });

  // Dernière et unique fois où les codes quittent le serveur.
  return res.status(200).json({ codes: plainCodes.map(formatCode) });
}

async function redeemCode(res, auth, submitted) {
  const code = normalizeCode(submitted);
  if (code.length !== CODE_LENGTH) {
    return res.status(400).json({ error: "Code de secours invalide." });
  }

  // Anti force brute : 10 essais par heure, puis blocage.
  const limit = await enforceRateLimit(auth, "redeem_recovery_code", 10);
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error });

  const { data: stored, error } = await auth.client
    .from("admin_recovery_codes")
    .select("id, code_hash")
    .eq("user_id", auth.user.id)
    .is("used_at", null);

  if (error) {
    console.error("[RECOVERY CODES] Lecture:", error);
    return res.status(500).json({ error: "Vérification impossible." });
  }

  let matchedId = null;
  for (const row of stored || []) {
    if (await verifyCode(code, row.code_hash)) {
      matchedId = row.id;
      break;
    }
  }

  await writeAuditLog(auth, {
    action: "redeem_recovery_code",
    targetUserId: auth.user.id,
    metadata: { success: Boolean(matchedId) },
  });

  if (!matchedId) {
    return res.status(400).json({ error: "Code de secours invalide ou déjà utilisé." });
  }

  // Le code est valide : on le consomme AVANT de toucher aux facteurs.
  await auth.client
    .from("admin_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", matchedId);

  // On supprime les facteurs TOTP : l'utilisateur repasse en aal1, se
  // reconnecte, et ré-enrôle une nouvelle application. C'est la seule façon
  // propre de récupérer un compte sans pouvoir forger une session aal2.
  try {
    const { data: factorsData } = await auth.client.auth.admin.mfa.listFactors({
      userId: auth.user.id,
    });
    for (const factor of factorsData?.factors || []) {
      await auth.client.auth.admin.mfa.deleteFactor({ id: factor.id, userId: auth.user.id });
    }
  } catch (factorError) {
    console.error("[RECOVERY CODES] Suppression facteurs:", factorError);
    return res.status(500).json({
      error: "Code accepté mais suppression des facteurs impossible. Réessaie.",
    });
  }

  // Les codes restants n'ont plus d'objet sans 2FA.
  await auth.client.from("admin_recovery_codes").delete().eq("user_id", auth.user.id);

  return res.status(200).json({
    success: true,
    message:
      "Code accepté. La double authentification a été réinitialisée : reconnecte-toi puis réactive-la.",
  });
}

async function clearCodes(res, auth) {
  await auth.client.from("admin_recovery_codes").delete().eq("user_id", auth.user.id);
  await writeAuditLog(auth, { action: "clear_recovery_codes", targetUserId: auth.user.id });
  return res.status(200).json({ success: true });
}
