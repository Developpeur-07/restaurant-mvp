// api/_lib/admin-auth.js
//
// Utilitaires partagés par les endpoints d'administration.
// Le caractère "_" empêche Vercel d'exposer ce fichier comme une route.
//
// Règles appliquées par toutes les routes sensibles :
//   1. Le JWT Supabase est vérifié CÔTÉ SERVEUR (signature + expiration),
//      jamais fait confiance tel quel.
//   2. Si l'utilisateur possède un facteur MFA vérifié, le JWT doit être en
//      `aal2`. Un session aal1 (mot de passe seul) est refusée.
//   3. Une action sur un membre de l'équipe n'est autorisée qu'au propriétaire
//      du restaurant concerné (ou au super-admin).

import { createClient } from "@supabase/supabase-js";

/** Client service_role : contourne RLS, ne doit JAMAIS sortir du serveur. */
export function getAdminClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return { client: null, error: "Configuration Supabase serveur manquante." };
  }

  return {
    client: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    error: null,
  };
}

function readBearerToken(req) {
  const authorization = req.headers?.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/**
 * Décode la charge utile d'un JWT SANS vérifier la signature.
 * À n'utiliser qu'APRÈS que auth.getUser() a validé le token, sinon les claims
 * ne sont pas fiables.
 */
export function decodeJwtClaims(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Authentifie l'appelant.
 * @returns {{ ok: true, user: object, token: string, claims: object, client: object }}
 *          ou {{ ok: false, status: number, error: string }}
 */
export async function authenticate(req) {
  const { client, error: configError } = getAdminClient();
  if (!client) {
    return { ok: false, status: 500, error: configError };
  }

  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "Authentification requise." };
  }

  // Vérification réelle de la signature côté Supabase.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Session invalide ou expirée." };
  }

  return { ok: true, client, user: data.user, token, claims: decodeJwtClaims(token) || {} };
}

/** L'utilisateur possède-t-il au moins un facteur MFA vérifié ? */
export async function hasVerifiedFactor(client, userId) {
  try {
    const { data } = await client.auth.admin.mfa.listFactors({ userId });
    return (data?.factors || []).some((factor) => factor.status === "verified");
  } catch (error) {
    console.error("[ADMIN AUTH] listFactors:", error);
    // En cas de doute on n'ouvre pas la porte : on considère qu'il y en a un.
    return true;
  }
}

/**
 * Si l'utilisateur a activé la 2FA, exige un JWT aal2.
 * @returns {{ ok: true }} ou {{ ok: false, status: number, error: string, code: string }}
 */
export async function requireAal2IfEnrolled(auth) {
  const enrolled = await hasVerifiedFactor(auth.client, auth.user.id);
  if (enrolled && auth.claims?.aal !== "aal2") {
    return {
      ok: false,
      status: 403,
      code: "mfa_required",
      error: "Double authentification requise pour cette action.",
    };
  }
  return { ok: true };
}

/**
 * restaurant_id dont l'utilisateur est propriétaire (null sinon).
 * `required = true` renvoie une erreur 403 plutôt que null.
 */
export async function resolveOwnedRestaurantId(auth, { required = true } = {}) {
  if (auth.user.app_metadata?.role === "super_admin") {
    // Le super-admin opère sur n'importe quel établissement (cible fournie par
    // l'appelant). On laisse passer, la vérification d'appartenance se fait
    // ensuite sur la ligne staff réellement visée.
    return { restaurantId: null, isSuperAdmin: true };
  }

  const { data, error } = await auth.client
    .from("restaurants")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return { error: { ok: false, status: 500, error: "Lecture du restaurant impossible." } };
  }

  if (!data?.id) {
    if (!required) return { restaurantId: null, isSuperAdmin: false };
    return {
      error: {
        ok: false,
        status: 403,
        error: "Action réservée au propriétaire du restaurant.",
      },
    };
  }

  return { restaurantId: data.id, isSuperAdmin: false };
}

/**
 * Anti-abus simple et durable : plafonne le nombre d'actions sensibles par
 * heure et par utilisateur, en s'appuyant sur le journal d'audit (pas sur la
 * mémoire du lambda, qui n'est pas persistante).
 */
export async function enforceRateLimit(auth, action, limit = 20) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await auth.client
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", auth.user.id)
    .eq("action", action)
    .gte("created_at", since);

  if (error) {
    // Ne bloque pas l'action si le journal est indisponible.
    return { ok: true };
  }
  if ((count || 0) >= limit) {
    return {
      ok: false,
      status: 429,
      error: "Trop de tentatives. Réessaie dans une heure.",
    };
  }
  return { ok: true };
}

export async function writeAuditLog(auth, { action, targetUserId = null, restaurantId = null, metadata = null }) {
  try {
    await auth.client.from("admin_audit_log").insert({
      actor_user_id: auth.user.id,
      action,
      target_user_id: targetUserId,
      restaurant_id: restaurantId,
      metadata,
    });
  } catch (error) {
    console.error("[ADMIN AUTH] Ecriture audit impossible:", error);
  }
}
