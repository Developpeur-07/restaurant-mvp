// api/sessions/claim.js
//
// Enregistre l'appareil courant et signale s'il existe une session
// concurrente sur le même compte.
//
// Appelé juste après une connexion réussie. Ne révoque rien : il ne fait
// qu'informer, c'est le client qui décide ensuite de présenter le défi 2FA.

import { authenticate, hasVerifiedFactor } from '../_lib/admin-auth'

// Fenêtre d'activité, alignée sur docs/026_sessions.sql.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const auth = await authenticate(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const deviceId = String(req.body?.deviceId || '').slice(0, 200)
  if (!deviceId) {
    return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })
  }

  const now = new Date().toISOString()

  // On réactive une éventuelle ligne révoquée du même appareil : c'est le même
  // téléphone qui se reconnecte, pas un appareil concurrent.
  const { error: upsertError } = await auth.client
    .from('user_sessions')
    .upsert(
      {
        user_id: auth.user.id,
        device_id: deviceId,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
        last_seen_at: now,
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
