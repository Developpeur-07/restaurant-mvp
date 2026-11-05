// api/admin/staff.js
//
// Gestion de l'équipe depuis l'interface d'administration.
//
// GET  /api/admin/staff
//      Liste les comptes cuisine / réception du restaurant de l'appelant,
//      avec leur email (lisible uniquement côté serveur, auth.users n'est pas
//      exposé au client).
//
// POST /api/admin/staff
//      Body : { staffUserId, newPassword }
//      Réinitialise le mot de passe d'un membre de l'équipe sans lui envoyer
//      d'email et sans le déconnecter de ses autres appareils.
//
// Sécurité (dans l'ordre) :
//   1. JWT vérifié côté serveur (api/_lib/admin-auth.js)
//   2. 2FA exigée si l'appelant l'a activée (claim `aal`)
//   3. Appelant = propriétaire du restaurant (ou super_admin)
//   4. La cible appartient bien à ce restaurant
//   5. Mot de passe validé côté serveur (>= 8 caractères, non trivial)
//   6. Action journalisée + plafonnée

import {
  authenticate,
  requireAal2IfEnrolled,
  resolveOwnedRestaurantId,
  enforceRateLimit,
  writeAuditLog,
} from "../_lib/admin-auth.js";

const MIN_PASSWORD_LENGTH = 8;

// Refuse les mots de passe les plus courants : l'admin fixe le mot de passe
// d'un collègue, il ne doit pas pouvoir lui donner "password".
const WEAK_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "azertyui",
  "qwertyui", "restaurant", "cuisine00", "motdepasse", "00000000",
]);

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  // 1 — Authentification -----------------------------------------------------
  const auth = await authenticate(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // 2 — 2FA ------------------------------------------------------------------
  const mfa = await requireAal2IfEnrolled(auth);
  if (!mfa.ok) return res.status(mfa.status).json({ error: mfa.error, code: mfa.code });

  // 3 — Propriété du restaurant ---------------------------------------------
  const owned = await resolveOwnedRestaurantId(auth);
  if (owned.error) return res.status(owned.error.status).json({ error: owned.error.error });

  const body = req.method === "POST" ? req.body || {} : req.query || {};
  const restaurantId = owned.isSuperAdmin ? body.restaurantId || null : owned.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ error: "restaurantId manquant." });
  }

  try {
    if (req.method === "GET") {
      return await listStaff(req, res, auth, restaurantId);
    }
    return await resetStaffPassword(req, res, auth, restaurantId, body);
  } catch (error) {
    console.error("[ADMIN STAFF] Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur interne." });
  }
}

async function listStaff(req, res, auth, restaurantId) {
  const { data: rows, error } = await auth.client
    .from("restaurant_staff")
    .select("id, user_id, role, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ADMIN STAFF] Lecture restaurant_staff:", error);
    return res.status(500).json({ error: "Lecture de l'équipe impossible." });
  }

  // auth.users n'est pas accessible en lecture depuis le client : on résout les
  // emails ici, un par un, côté serveur.
  const members = await Promise.all(
    (rows || []).map(async (row) => {
      let email = null;
      let lastSignInAt = null;
      try {
        const { data } = await auth.client.auth.admin.getUserById(row.user_id);
        email = data?.user?.email ?? null;
        lastSignInAt = data?.user?.last_sign_in_at ?? null;
      } catch {
        // Un utilisateur supprimé côté auth ne doit pas faire échouer la liste.
      }
      return {
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        created_at: row.created_at,
        email,
        last_sign_in_at: lastSignInAt,
      };
    })
  );

  return res.status(200).json({ members });
}

async function resetStaffPassword(req, res, auth, restaurantId, body) {
  const staffUserId = typeof body.staffUserId === "string" ? body.staffUserId : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!staffUserId) {
    return res.status(400).json({ error: "Membre introuvable." });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
  }
  if (WEAK_PASSWORDS.has(newPassword.toLowerCase())) {
    return res.status(400).json({ error: "Ce mot de passe est trop courant, choisis-en un autre." });
  }
  if (staffUserId === auth.user.id) {
    return res.status(400).json({
      error: "Pour ton propre mot de passe, utilise la section « Changer le mot de passe ».",
    });
  }

  // Anti-abus
  const limit = await enforceRateLimit(auth, "reset_staff_password", 20);
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error });

  // 4 — La cible appartient bien au restaurant -------------------------------
  const { data: target, error: targetError } = await auth.client
    .from("restaurant_staff")
    .select("id, role, user_id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", staffUserId)
    .maybeSingle();

  if (targetError) {
    console.error("[ADMIN STAFF] Lecture cible:", targetError);
    return res.status(500).json({ error: "Vérification du membre impossible." });
  }
  if (!target) {
    return res.status(404).json({ error: "Ce membre n'appartient pas à ton restaurant." });
  }

  // 5 — Mise à jour ----------------------------------------------------------
  const { error: updateError } = await auth.client.auth.admin.updateUserById(staffUserId, {
    password: newPassword,
  });

  if (updateError) {
    console.error("[ADMIN STAFF] updateUserById:", updateError);
    return res.status(500).json({ error: "Réinitialisation impossible : " + updateError.message });
  }

  // 6 — Journal --------------------------------------------------------------
  await writeAuditLog(auth, {
    action: "reset_staff_password",
    targetUserId: staffUserId,
    restaurantId,
    metadata: { role: target.role },
  });

  return res.status(200).json({
    success: true,
    message: "Mot de passe réinitialisé. Communique-le au membre de l'équipe.",
  });
}
