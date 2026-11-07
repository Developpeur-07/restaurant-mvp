// api/sessions/revoke-others.js
//
// Déconnecte tous les autres appareils du compte.
//
// C'EST ICI que se trouve la règle, et volontairement côté serveur : exiger la
// 2FA dans le client n'aurait aucune valeur, le client est contournable.
// requireAal2IfEnrolled refuse l'appel si l'utilisateur a activé la 2FA mais
// que son jeton est encore en aal1 (mot de passe seul).
//
// Sans la 2FA, l'appel est accepté : on ne peut pas exiger un second facteur
// qui n'existe pas, et bloquer reviendrait à enfermer dehors le propriétaire
// qui aurait simplement perdu son téléphone.

import { authenticate, requireAal2IfEnrolled, writeAuditLog } from '../_lib/admin-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const auth = await authenticate(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const mfa = await requireAal2IfEnrolled(auth)
  if (!mfa.ok) {
    return res.status(mfa.status).json({ error: mfa.error, code: mfa.code })
  }

  const deviceId = String(req.body?.deviceId || '').slice(0, 200)
  if (!deviceId) {
    return res.status(400).json({ error: 'Identifiant d’appareil manquant.' })
  }

  // 1. Révocation réelle : les jetons de rafraîchissement des autres appareils
  //    ne sont plus valables. C'est la seule étape qui compte côté sécurité.
  const { error: revokeError } = await auth.client.auth.admin.signOut(
    auth.token,
    'others',
  )

  if (revokeError) {
    console.error('[SESSIONS] signOut others:', revokeError.message)
    return res.status(500).json({ error: 'Révocation impossible. Réessaie.' })
  }

  // 2. La table ne fait que refléter la décision, pour que les autres
  //    appareils comprennent pourquoi leur prochain appel échouera.
  const { data: revoked, error: updateError } = await auth.client
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .neq('device_id', deviceId)
    .is('revoked_at', null)
    .select('device_id')

  if (updateError) {
    // Non bloquant : la révocation des jetons a déjà eu lieu. On ne fait
    // qu'avertir, la sécurité n'est pas en jeu.
    console.error('[SESSIONS] mise à jour:', updateError.message)
  }

  await writeAuditLog(auth, {
    action: 'session.revoke_others',
    metadata: { revoked: revoked?.length ?? 0 },
  })

  return res.status(200).json({ revoked: revoked?.length ?? 0 })
}
