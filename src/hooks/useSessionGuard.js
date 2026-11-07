// src/hooks/useSessionGuard.js
//
// Maintient la session de cet appareil vivante, et le déconnecte s'il a été
// évincé par une connexion plus récente ailleurs.
//
// Deux signaux possibles, volontairement redondants :
//   1. l'API répond 401 — les jetons ont été révoqués par revoke-others. C'est
//      le cas normal, et le plus sûr : il vient de Supabase, pas de nous.
//   2. l'API répond { revoked: true } — la révocation est enregistrée dans la
//      table mais les jetons sont encore valides. Filet de sécurité.
//
// Le battement est envoyé toutes les 60 secondes, pour une fenêtre d'activité
// de 5 minutes côté serveur : deux battements peuvent se perdre sans que
// l'appareil passe pour inactif.

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'

const HEARTBEAT_MS = 60_000
const FIRST_BEAT_MS = 5_000

export default function useSessionGuard() {
  useEffect(() => {
    let cancelled = false
    let timer

    async function signOutAndWarn() {
      // On repasse par /login avec un motif : l'écran de connexion explique
      // pourquoi la session s'est terminée, au lieu de laisser croire à un bug.
      await supabase.auth.signOut()
      window.location.assign('/login?deconnecte=1')
    }

    async function beat() {
      try {
        const result = await apiRequest('/api/sessions', {
          method: 'POST',
          body: { action: 'heartbeat', deviceId: getDeviceId() },
        })
        if (!cancelled && result?.revoked) {
          await signOutAndWarn()
          return
        }
      } catch (error) {
        // 401 = jetons révoqués. Les autres erreurs (serveur injoignable,
        // fonctionnalité indisponible en développement local) ne doivent
        // jamais déconnecter quelqu'un pour rien.
        if (!cancelled && error?.status === 401) {
          await signOutAndWarn()
          return
        }
      } finally {
        if (!cancelled) timer = setTimeout(beat, HEARTBEAT_MS)
      }
    }

    timer = setTimeout(beat, FIRST_BEAT_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])
}
