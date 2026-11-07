import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { apiRequest } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'
import { Sun, Moon, Mail, Smartphone } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [resetSent, setResetSent] = useState(false)

  // Prise de contrôle : un autre appareil est déjà connecté à ce compte.
  const [takeover, setTakeover] = useState(false)
  const [factorId, setFactorId] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [searchParams] = useSearchParams()

  // Cet appareil a été évincé par une connexion plus récente ailleurs.
  const evicted = searchParams.get('deconnecte') === '1'

  // ── THÈME — couleur système par défaut, dark mode fonctionnel ──
  const { theme, darkMode, toggleDarkMode } = useTheme('#1F2A44')

  // Compte cuisine -> /kitchen. Propriétaire et réception -> /dashboard
  // (Dashboard.jsx résout maintenant les deux via SubscriptionProvider).
  async function redirectByRole(userId) {
    const { data: staffRow } = await supabase
      .from('restaurant_staff')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'kitchen')
      .maybeSingle()

    navigate(staffRow ? '/kitchen' : '/dashboard')
  }

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    // Un seul appareil actif par compte : on déclare celui-ci, puis on regarde
    // s'il y en a un autre.
    try {
      const claim = await apiRequest('/api/sessions', {
        method: 'POST',
        body: { action: 'claim', deviceId: getDeviceId() },
      })

      if (claim.others > 0) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const verified = (factors?.totp || []).find((f) => f.status === 'verified')

        if (verified) {
          // Défi 2FA. Sans lui, un mot de passe volé suffirait à évincer le
          // propriétaire légitime de son propre compte : ce serait une prise
          // de contrôle offerte à l'attaquant.
          setFactorId(verified.id)
          setTakeover(true)
          setLoading(false)
          return
        }

        // Pas de 2FA activée : on ne peut rien exiger de plus, et refuser
        // reviendrait à enfermer dehors le propriétaire qui a perdu son
        // téléphone. On évince, puis on invitera à activer la 2FA.
        await apiRequest('/api/sessions', {
          method: 'POST',
          body: { action: 'revoke-others', deviceId: getDeviceId() },
        })
        setNotice('Un autre appareil utilisait ce compte : il a été déconnecté. Active la double authentification dans Paramètres → Sécurité.')
        await redirectByRole(data.user.id)
        return
      }
    } catch (claimError) {
      // Service de sessions indisponible (développement local, clé service
      // absente) : on ne bloque jamais une connexion pour ça.
      console.warn('Sessions : service indisponible', claimError?.message)
    }

    await redirectByRole(data.user.id)
  }

  async function handleTakeover(event) {
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

    if (verifyError) {
      setBusy(false)
      setError(
        verifyError.code === 'mfa_verification_rejected'
          ? "Trop d'essais infructueux. Patiente quelques minutes puis réessaie."
          : 'Code incorrect ou expiré. Réessaie.',
      )
      return
    }

    // Le jeton est passé en aal2 : le serveur acceptera la révocation.
    try {
      await apiRequest('/api/sessions', {
        method: 'POST',
        body: { action: 'revoke-others', deviceId: getDeviceId() },
      })
    } catch (revokeError) {
      setBusy(false)
      setError(revokeError?.message || "Déconnexion de l'autre appareil impossible.")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await redirectByRole(user.id)
  }

  async function cancelTakeover() {
    // On abandonne : on rend la place à l'appareil déjà connecté, plutôt que
    // de laisser deux sessions ouvertes.
    await supabase.auth.signOut()
    setTakeover(false)
    setCode('')
    setError('')
    setLoading(false)
  }

  async function handleReset() {
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password'
    })
    setResetSent(true)
    setLoading(false)
  }

  if (resetSent) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <Mail size={48} color={theme.primary} style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
          Email envoyé
        </p>
        <p style={{ color: theme.textPrimary, fontSize: '0.85rem' }}>
          Vérifiez votre boîte mail pour réinitialiser votre mot de passe
        </p>
        <button
          onClick={() => { setResetSent(false); setMode('login') }}
          style={{ marginTop: '20px', color: theme.textPrimary, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          ← Retour à la connexion
        </button>
      </div>
    </div>
  )

  // ── ÉCRAN DE PRISE DE CONTRÔLE ──────────────────────────────────────────
  // Présenté uniquement quand un autre appareil est déjà connecté ET que le
  // compte a activé la 2FA. Le code demandé est celui de l'application
  // d'authentification : il prouve qu'on est bien le propriétaire, et pas
  // seulement quelqu'un qui connaît le mot de passe.
  if (takeover) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ width: '100%', maxWidth: '390px', background: theme.cardBackground, borderRadius: '22px', padding: '30px 24px', boxShadow: '0 10px 34px rgba(0,0,0,0.12)' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: `${theme.primary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={28} color={theme.primary} />
          </span>
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.15rem', textAlign: 'center', margin: '0 0 10px' }}>
          Ce compte est ouvert ailleurs
        </h1>
        <p style={{ color: theme.textSecondary, fontSize: '0.83rem', lineHeight: 1.55, textAlign: 'center', margin: '0 0 22px' }}>
          Un autre appareil utilise déjà ce compte. Saisis le code à 6 chiffres de
          ton application d&apos;authentification pour le déconnecter et continuer ici.
        </p>

        <form onSubmit={handleTakeover}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000 000"
            aria-label="Code à six chiffres"
            style={{
              width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px',
              padding: '14px', fontSize: '1.5rem', letterSpacing: '0.35em', textAlign: 'center',
              background: theme.pageBackground, color: theme.textPrimary, outline: 'none',
              boxSizing: 'border-box', fontFamily: 'monospace',
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
            {busy ? 'Vérification...' : "Déconnecter l'autre appareil"}
          </button>
        </form>

        <button
          onClick={cancelTakeover}
          style={{
            width: '100%', marginTop: '12px', background: 'transparent', border: 'none',
            color: theme.textSecondary, fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          Annuler et laisser l&apos;autre appareil connecté
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER — theme.primary, cohérent avec QRCode/MenuManager/Dashboard/Kitchen */}
      <div style={{
        background: `linear-gradient(170deg, ${theme.primary}CC, ${theme.primary})`,
        padding: '40px 20px 32px',
        textAlign: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <button
          onClick={toggleDarkMode}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
            padding: '8px 10px', cursor: 'pointer', flexShrink: 0,
            position: 'absolute', top: '16px', right: '16px',
            display: 'flex', alignItems: 'center'
          }}
        >
          {darkMode ? <Sun size={16} color="#fff" /> : <Moon size={16} color="#fff" />}
        </button>

        <p style={{ color: '#fff', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>
          Espace Administration
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>
          Restaurant
        </h1>

      </div>

      {/* FORMULAIRE */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <h2 style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.3rem', marginBottom: '6px' }}>
            {mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}
          </h2>
          <p style={{ color: theme.textSecondary, fontSize: '0.8rem', marginBottom: '24px' }}>
            {mode === 'login' ? 'Accédez à votre tableau de bord' : 'Entrez votre email pour réinitialiser'}
          </p>

          {(evicted || notice) && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FCD9A8', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <p style={{ color: '#8A5A00', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                {evicted
                  ? 'Ta session a été fermée : ce compte s’est connecté sur un autre appareil. Reconnecte-toi pour reprendre la main ici.'
                  : notice}
              </p>
            </div>
          )}

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ color: '#cc0000', fontSize: '0.82rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textPrimary, marginBottom: '6px', fontWeight: '600' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '10px',
                padding: '12px 14px', fontSize: '0.9rem', background: theme.cardBackground,
                color: theme.textPrimary, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.borderLight}
            />
          </div>

          {mode === 'login' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textPrimary, marginBottom: '6px', fontWeight: '600' }}>
                Mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '10px',
                  padding: '12px 14px', fontSize: '0.9rem', background: theme.cardBackground,
                  color: theme.textPrimary, outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = theme.primary}
                onBlur={e => e.target.style.borderColor = theme.borderLight}
              />
            </div>
          )}

          {mode === 'login' ? (
            <>
              <button
                onClick={handleLogin}
                disabled={!email || !password || loading}
                style={{
                  width: '100%', background: theme.primary, color: '#fff', border: 'none',
                  borderRadius: '12px', padding: '14px', fontWeight: 'bold',
                  fontSize: '0.95rem', cursor: 'pointer', marginBottom: '14px',
                  opacity: (!email || !password || loading) ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <button
                onClick={() => setMode('reset')}
                style={{ width: '100%', background: 'none', border: 'none', color: theme.textSecondary, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Mot de passe oublié ?
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReset}
                disabled={!email || loading}
                style={{
                  width: '100%', background: theme.primary, color: '#fff', border: 'none',
                  borderRadius: '12px', padding: '14px', fontWeight: 'bold',
                  fontSize: '0.95rem', cursor: 'pointer', marginBottom: '14px',
                  opacity: (!email || loading) ? 0.6 : 1
                }}
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button
                onClick={() => setMode('login')}
                style={{ width: '100%', background: 'none', border: 'none', color: theme.textSecondary, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}