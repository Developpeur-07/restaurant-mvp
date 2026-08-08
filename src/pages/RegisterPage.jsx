import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { Sun, Moon, Store, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const { token } = useParams()
  const { theme, darkMode, toggleDarkMode } = useTheme('#1F2A44')

  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError('')

    if (!restaurantName.trim()) {
      setError('Le nom du restaurant est requis')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password
    })

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes('already registered')
          ? 'Un compte existe déjà avec cet email. Connectez-vous plutôt.'
          : signUpError.message
      )
      setLoading(false)
      return
    }

    const ownerId = signUpData?.user?.id
    if (!ownerId) {
      setError("La création du compte a échoué. Réessayez.")
      setLoading(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('use_restaurant_registration_token', {
      p_token: token,
      p_restaurant_name: restaurantName.trim(),
      p_owner_user_id: ownerId
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <CheckCircle2 size={48} color={theme.primary} style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
          Compte créé
        </p>
        <p style={{ color: theme.textPrimary, fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto 20px' }}>
          Votre restaurant a bien été enregistré. Vous pouvez maintenant vous connecter
          pour accéder à votre espace.
        </p>
        <Link
          to="/login"
          style={{
            display: 'inline-block', background: theme.primary, color: '#fff',
            border: 'none', borderRadius: '12px', padding: '14px 28px',
            fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none'
          }}
        >
          Aller à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

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

        <Store size={28} color="#fff" style={{ marginBottom: '10px' }} />
        <p style={{ color: '#fff', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>
          Inscription
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>
          Créer votre restaurant
        </h1>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <h2 style={{ fontFamily: 'Georgia, serif', color: theme.textPrimary, fontSize: '1.3rem', marginBottom: '6px' }}>
            Vos informations
          </h2>
          <p style={{ color: theme.textSecondary, fontSize: '0.8rem', marginBottom: '24px' }}>
            Ce lien vous a été transmis directement — renseignez vos informations pour activer votre espace
          </p>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ color: '#cc0000', fontSize: '0.82rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <Field label="Nom du restaurant" theme={theme}>
            <input
              type="text"
              placeholder="Votre établissement"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              style={inputStyle(theme)}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.borderLight}
            />
          </Field>

          <Field label="Email" theme={theme}>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle(theme)}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.borderLight}
            />
          </Field>

          <Field label="Mot de passe" theme={theme}>
            <input
              type="password"
              placeholder="8 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle(theme)}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.borderLight}
            />
          </Field>

          <Field label="Confirmer le mot de passe" theme={theme} marginBottom="20px">
            <input
              type="password"
              placeholder="Retapez le mot de passe"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle(theme)}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.borderLight}
            />
          </Field>

          <button
            onClick={handleSubmit}
            disabled={!restaurantName || !email || !password || !confirmPassword || loading}
            style={{
              width: '100%', background: theme.primary, color: '#fff', border: 'none',
              borderRadius: '12px', padding: '14px', fontWeight: 'bold',
              fontSize: '0.95rem', cursor: 'pointer', marginBottom: '14px',
              opacity: (!restaurantName || !email || !password || !confirmPassword || loading) ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>

          <p style={{ textAlign: 'center', color: theme.textSecondary, fontSize: '0.82rem' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: theme.primary, fontWeight: '600', textDecoration: 'none' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, theme, children, marginBottom = '14px' }) {
  return (
    <div style={{ marginBottom }}>
      <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textPrimary, marginBottom: '6px', fontWeight: '600' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function inputStyle(theme) {
  return {
    width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '10px',
    padding: '12px 14px', fontSize: '0.9rem', background: theme.cardBackground,
    color: theme.textPrimary, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }
}