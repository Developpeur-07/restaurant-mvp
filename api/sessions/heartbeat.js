// api/sessions/heartbeat.js
//
// Battement de coeur envoyé toutes les 60 secondes par l'application.
//
// Deux services :
//   1. maintenir last_seen_at à jour, pour qu'un appareil réellement utilisé
//      reste « actif » (cf. la fenêtre de 5 minutes de 026_sessions.sql) ;
//   2. prévenir l'appareil évincé qu'il doit se déconnecter.
//
// Le point 2 fonctionne d'abord par l'échec d'authentification : une fois les
// jetons révoqués par revoke-others, authenticate() répond 401 et le client se
// déconnecte. La table ne sert que de filet si les jetons sont encore
// techniquement valides — par exemple quand la révocation a été enregistrée
// mais pas encore propagée.

import { authenticate } from '../_lib/admin-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const auth = await authenticate(req)
  if (!auth.ok) {
    // Le client interprète 401 comme « cet appareil a été déconnecté ».
    return res.status(auth.status).json({ error: auth.error, revoked: true })
  }

  const deviceId = String(req.body?.deviceId || '').slice(0, 200)
  if (!deviceId) {
    return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })
  }

  const { data: row } = await auth.client
    .from('user_sessions')
    .select('revoked_at')
    .eq('user_id', auth.user.id)
    .eq('device_id', deviceId)
    .maybeSingle()

  if (row?.revoked_at) {
    return res.status(200).json({ revoked: true })
  }

  await auth.client
    .from('user_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .eq('device_id', deviceId)

  return res.status(200).json({ revoked: false })
}
