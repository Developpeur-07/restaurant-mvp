import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [resetSent, setResetSent] = useState(false)

  // ── THÈME — couleur système par défaut, dark mode fonctionnel ──
  const { theme, darkMode, toggleDarkMode } = useTheme('#8B0000')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    navigate('/dashboard')
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
        <p style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</p>
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

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(170deg, ${theme.textSecondary}CC, ${theme.textSecondary})`,
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
            padding: '8px 10px', cursor: 'pointer', fontSize: '1rem', flexShrink: 0,
            position: 'absolute', top: '16px', right: '16px'
            
          }}
        >
          {darkMode ? '☀️' : '🌙'}
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
          <p style={{ color: theme.textPrimary, fontSize: '0.8rem', marginBottom: '24px' }}>
            {mode === 'login' ? 'Accédez à votre tableau de bord' : 'Entrez votre email pour réinitialiser'}
          </p>

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
              onFocus={e => e.target.style.borderColor = theme.textPrimary}
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
                onFocus={e => e.target.style.borderColor = theme.textPrimary}
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
                  width: '100%', background: theme.textMuted, color: theme.textPrimary, border: 'none',
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
                style={{ width: '100%', background: 'none', border: 'none', color: theme.textPrimary, fontSize: '0.82rem', cursor: 'pointer' }}
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
                  width: '100%', background: theme.textPrimary, color: '#fff', border: 'none',
                  borderRadius: '12px', padding: '14px', fontWeight: 'bold',
                  fontSize: '0.95rem', cursor: 'pointer', marginBottom: '14px',
                  opacity: (!email || loading) ? 0.6 : 1
                }}
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button
                onClick={() => setMode('login')}
                style={{ width: '100%', background: 'none', border: 'none', color: theme.textPrimary, fontSize: '0.82rem', cursor: 'pointer' }}
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