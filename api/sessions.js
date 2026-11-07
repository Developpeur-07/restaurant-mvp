// api/sessions.js
//
// Gestion des sessions : un seul appareil actif par compte.
//
// POURQUOI UN SEUL FICHIER AVEC UN DISPATCH `action` :
// Vercel limite le plan Hobby à 12 fonctions serverless par déploiement.
// Trois endpoints séparés (claim, heartbeat, revoke-others) faisaient dépasser
// le compte. Regrouper trois fonctions internes en une seule route n'a aucun
// coût fonctionnel — ces trois actions servent le même appelant, au même
// moment — alors qu'une fonction de moins par détail technique devient
// vite un plat de spaghettis.
//
// Rappel de la règle métier : quand un second appareil se connecte, l'ancien
// est déconnecté, MAIS seulement après vérification de la double
// authentification. Sans cette vérification, un mot de passe volé suffirait à
// évincer le propriétaire légitime de son propre compte.
//
// La règle 2FA est appliquée CÔTÉ SERVEUR via requireAal2IfEnrolled. L'exiger
// dans le client n'aurait aucune valeur : le client est contournable.

import { authenticate, requireAal2IfEnrolled, hasVerifiedFactor, writeAuditLog } from './_lib/admin-auth'

// Fenêtre d'activité, alignée sur docs/026_sessions.sql.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000

/** Enregistre l'appareil courant et signale une session concurrente. */
async function claim(req, res, auth) {
  const deviceId = readDeviceId(req)
  if (!deviceId) return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })

  // On réactive une éventuelle ligne révoquée du même appareil : c'est le même
  // téléphone qui se reconnecte, pas un appareil concurrent.
  const { error: upsertError } = await auth.client
    .from('user_sessions')
    .upsert(
      {
        user_id: auth.user.id,
        device_id: deviceId,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'user_id,device_id' },
    )

  if (upsertError) {
    console.error('[SESSIONS] upsert:', upsertError.message)
    return res.status(500).json({ error: 'Enregistrement de l’appareil impossible.' })
  }

  const { data: others, error: readError } = await auth.client
    .from('user_sessions')
    .select('device_id, device_label, user_agent, last_seen_at')
    .eq('user_id', auth.user.id)
    .neq('device_id', deviceId)
    .is('revoked_at', null)
    .gt('last_seen_at', new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString())

  if (readError) {
    console.error('[SESSIONS] lecture:', readError.message)
    return res.status(500).json({ error: 'Lecture des sessions impossible.' })
  }

  return res.status(200).json({
    others: (others || []).length,
    devices: others || [],
    mfaEnrolled: await hasVerifiedFactor(auth.client, auth.user.id),
  })
}

/** Battement de coeur : maintient l'appareil actif, détecte l'éviction. */
async function heartbeat(req, res, auth) {
  const deviceId = readDeviceId(req)
  if (!deviceId) return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })

  const { data: row } = await auth.client
    .from('user_sessions')
    .select('revoked_at')
    .eq('user_id', auth.user.id)
    .eq('device_id', deviceId)
    .maybeSingle()

  if (row?.revoked_at) return res.status(200).json({ revoked: true })

  await auth.client
    .from('user_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .eq('device_id', deviceId)

  return res.status(200).json({ revoked: false })
}

/** Déconnecte tous les autres appareils. Exige la 2FA si elle est activée. */
async function revokeOthers(req, res, auth) {
  const mfa = await requireAal2IfEnrolled(auth)
  if (!mfa.ok) return res.status(mfa.status).json({ error: mfa.error, code: mfa.code })

  const deviceId = readDeviceId(req)
  if (!deviceId) return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })

  // 1. Révocation réelle : les jetons de rafraîchissement des autres appareils
  //    ne sont plus valables. C'est la seule étape qui compte côté sécurité.
  const { error: revokeError } = await auth.client.auth.admin.signOut(auth.token, 'others')
  if (revokeError) {
    console.error('[SESSIONS] signOut others:', revokeError.message)
    return res.status(500).json({ error: 'Révocation impossible. Réessaie.' })
  }

  // 2. La table ne fait que refléter la décision, pour que les autres appareils
  //    comprennent pourquoi leur prochain appel échouera.
  const { data: revoked, error: updateError } = await auth.client
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .neq('device_id', deviceId)
    .is('revoked_at', null)
    .select('device_id')

  if (updateError) {
    // Non bloquant : la révocation des jetons a déjà eu lieu.
    console.error('[SESSIONS] mise à jour:', updateError.message)
  }

  await writeAuditLog(auth, {
    action: 'session.revoke_others',
    metadata: { revoked: revoked?.length ?? 0 },
  })

  return res.status(200).json({ revoked: revoked?.length ?? 0 })
}

function readDeviceId(req) {
  return String(req.body?.deviceId || '').slice(0, 200)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const auth = await authenticate(req)
  if (!auth.ok) {
    // Le client interprète 401 comme « cet appareil a été déconnecté ».
    return res.status(auth.status).json({ error: auth.error, revoked: true })
  }

  switch (String(req.body?.action || '')) {
    case 'claim':
      return claim(req, res, auth)
    case 'heartbeat':
      return heartbeat(req, res, auth)
    case 'revoke-others':
      return revokeOthers(req, res, auth)
    default:
      return res.status(400).json({ error: 'Action inconnue.' })
  }
}
