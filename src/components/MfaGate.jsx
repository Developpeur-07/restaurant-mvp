// src/components/MfaGate.jsx
//
// Barrière de double authentification posée devant les pages sensibles
// (Dashboard, Settings, MenuManager, History, QRCode, SuperAdmin).
//
// Règle : SI l'utilisateur possède un facteur TOTP vérifié ET que sa session
// courante est en aal1 (mot de passe seul), ALORS on affiche le défi de code à
// 6 chiffres au lieu de la page demandée. Sans facteur vérifié, rien ne change
// -> pas de risque de bloquer un compte qui n'a jamais activé la 2FA.
//
// Issue de secours : un code de secours à usage unique consomme le code côté
// serveur, supprime les facteurs TOTP et rend à nouveau l'accès possible.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { apiRequest } from '../lib/api'
import { ShieldCheck, Smartphone, KeyRound, LogOut, Loader2 } from 'lucide-react'

function mfaErrorMessage(error) {
  switch (error?.code) {
    case 'mfa_verification_rejected':
      return "Trop d'essais infructueux. Patiente quelques minutes puis réessaie."
    case 'mfa_verification_failed':
      return 'Code incorrect ou expiré. Réessaie.'
    case 'mfa_factor_not_found':
      return 'Facteur introuvable. Reconnecte-toi.'
    case 'insufficient_aal':
      return 'Session insuffisante. Reconnecte-toi.'
    default:
      return error?.message || 'Vérification impossible.'
  }
}

export default function MfaGate({ children, accentColor = '#1F2A44' }) {
  const { theme } = useTheme(accentColor)
  const [status, setStatus] = useState('checking') // checking | challenge | ok
  const [factorId, setFactorId] = useState(null)
  const [mode, setMode] = useState('totp')        // totp | recovery
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const evaluate = useCallback(async () => {
    try {
      const [{ data: assurance }, { data: factors }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ])

      if (!assurance) {
        // Pas de session (cas anormal ici, ProtectedRoute a déjà filtré).
        setStatus('ok')
        return
      }

      const verifiedTotp = (factors?.totp || []).find((factor) => factor.status === 'verified')

      if (verifiedTotp && assurance.currentLevel !== 'aal2') {
        setFactorId(verifiedTotp.id)
        setStatus('challenge')
        return
      }

      setStatus('ok')
    } catch (evaluationError) {
      console.error('MfaGate: évaluation impossible', evaluationError)
      // On ne bloque jamais l'accès sur une erreur de lecture : la base reste
      // la dernière barrière si le durcissement RLS est activé.
      setStatus('ok')
    }
  }, [])

  useEffect(() => {
    // Lecture asynchrone de l'état MFA côté Supabase : le setState a lieu
    // après le retour réseau, pas dans le corps synchrone de l'effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    evaluate()
  }, [evaluate])

  async function handleTotpSubmit(event) {
    event?.preventDefault()
    if (busy) return
    const cleaned = code.replace(/\D/g, '')
    if (cleaned.length !== 6) {
      setError('Le code contient 6 chiffres.')
      return
    }

    setBusy(true)
    setError('')
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: cleaned,
    })
    setBusy(false)

    if (verifyError) {
      setError(mfaErrorMessage(verifyError))
      return
    }

    setCode('')
    setStatus('ok')
  }

  async function handleRecoverySubmit(event) {
    event?.preventDefault()
    if (busy) return
    if (!code.trim()) {
      setError('Saisis ton code de secours.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/security/recovery-codes', {
        method: 'POST',
        body: { action: 'redeem', code: code.trim() },
      })
      setCode('')
      setNotice(result.message || 'Code accepté.')
      setMode('recovered')
    } catch (requestError) {
      setError(requestError.message || 'Code de secours invalide.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  if (status === 'checking') {
    return (
      <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.textSecondary, fontFamily: 'Georgia, serif' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Vérification de sécurité...
        </div>
      </div>
    )
  }

  if (status === 'ok') return children

  // ── ÉCRAN DE DÉFI ────────────────────────────────────────────────────────
  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: '100%', maxWidth: '400px', background: theme.cardBackground,
        borderRadius: '22px', padding: '30px 24px', boxShadow: '0 10px 34px rgba(0,0,0,0.12)',
      }}>
        {mode === 'recovered' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={28} color="#166534" />
              </span>
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.2rem', textAlign: 'center', margin: '0 0 10px' }}>
              Accès rétabli
            </h1>
            <p style={{ color: theme.textSecondary, fontSize: '0.85rem', lineHeight: 1.55, textAlign: 'center', margin: '0 0 22px' }}>
              {notice} Pense à réactiver la double authentification dans <strong>Paramètres → Sécurité</strong> dès que tu as ton téléphone.
            </p>
            <button
              onClick={evaluate}
              style={{
                width: '100%', background: theme.primary, color: '#fff', border: 'none',
                borderRadius: '12px', padding: '14px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Accéder à mon espace
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', background: `${theme.primary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mode === 'totp'
                  ? <Smartphone size={28} color={theme.primary} />
                  : <KeyRound size={28} color={theme.primary} />}
              </span>
            </div>

            <h1 style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.2rem', textAlign: 'center', margin: '0 0 8px' }}>
              {mode === 'totp' ? 'Double authentification' : 'Code de secours'}
            </h1>
            <p style={{ color: theme.textSecondary, fontSize: '0.83rem', lineHeight: 1.55, textAlign: 'center', margin: '0 0 22px' }}>
              {mode === 'totp'
                ? "Saisis le code à 6 chiffres affiché dans Google Authenticator (ou Authy)."
                : "Saisis l'un des codes de secours enregistrés lors de l'activation de la 2FA."}
            </p>

            <form onSubmit={mode === 'totp' ? handleTotpSubmit : handleRecoverySubmit}>
              <input
                value={code}
                onChange={(event) => setCode(mode === 'totp' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)}
                inputMode={mode === 'totp' ? 'numeric' : 'text'}
                autoComplete="one-time-code"
                autoFocus
                placeholder={mode === 'totp' ? '000 000' : 'XXXX-XXXX-XXXX'}
                style={{
                  width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px',
                  padding: '14px', fontSize: mode === 'totp' ? '1.5rem' : '1rem',
                  letterSpacing: mode === 'totp' ? '0.35em' : 'normal',
                  textAlign: 'center', background: theme.pageBackground, color: theme.textPrimary,
                  outline: 'none', boxSizing: 'border-box', fontFamily: mode === 'totp' ? 'monospace' : 'inherit',
                }}
              />

              {error && (
                <p style={{ color: '#cc0000', fontSize: '0.8rem', textAlign: 'center', margin: '12px 0 0' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !code.trim()}
                style={{
                  width: '100%', marginTop: '18px', background: theme.primary, color: '#fff',
                  border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold',
                  fontSize: '0.9rem', cursor: busy || !code.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy || !code.trim() ? 0.6 : 1,
                }}
              >
                {busy ? 'Vérification...' : 'Vérifier'}
              </button>
            </form>

            <button
              onClick={() => { setMode(mode === 'totp' ? 'recovery' : 'totp'); setCode(''); setError('') }}
              style={{
                width: '100%', marginTop: '12px', background: 'transparent', border: 'none',
                color: theme.textSecondary, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {mode === 'totp' ? "J'ai perdu mon téléphone" : 'Revenir au code à 6 chiffres'}
            </button>

            <div style={{ height: '1px', background: theme.borderLight, margin: '18px 0' }} />

            <button
              onClick={handleLogout}
              style={{
                width: '100%', background: 'transparent', border: `2px solid ${theme.borderLight}`,
                borderRadius: '12px', padding: '12px', color: theme.textSecondary, fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <LogOut size={14} /> Se connecter avec un autre compte
            </button>
          </>
        )}
      </div>
    </div>
  )
}
