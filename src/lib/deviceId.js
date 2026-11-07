// src/lib/deviceId.js
//
// Identifiant d'appareil stable, conservé en localStorage.
//
// Ce n'est PAS un secret et il ne doit jamais servir à authentifier : il sert
// uniquement à distinguer deux appareils d'un même compte, pour savoir s'il
// existe une session concurrente. La sécurité repose entièrement sur les
// jetons Supabase.
//
// Deux onglets du même navigateur partagent donc le même identifiant : c'est
// voulu, on raisonne par appareil et non par onglet.

const STORAGE_KEY = 'restohub_device_id'

export function getDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) return existing

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    localStorage.setItem(STORAGE_KEY, generated)
    return generated
  } catch {
    // Navigation privée, stockage refusé : on retombe sur un identifiant
    // éphémère. L'appareil sera alors vu comme nouveau à chaque chargement, ce
    // qui désactive la détection de session concurrente mais ne casse rien.
    return `ephemere-${Math.random().toString(36).slice(2)}`
  }
}

/** Description lisible de l'appareil, pour l'écran qui prévient l'utilisateur. */
export function describeDevice() {
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iPhone|iPad|iPod/i.test(agent)) return 'iPhone ou iPad'
  if (/Android/i.test(agent)) return 'Téléphone Android'
  if (/Macintosh/i.test(agent)) return 'Mac'
  if (/Windows/i.test(agent)) return 'PC Windows'
  if (/Linux/i.test(agent)) return 'Linux'
  return 'Appareil inconnu'
}
