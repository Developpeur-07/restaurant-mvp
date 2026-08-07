import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { Lock, Sun, Moon, ChefHat, Bell } from 'lucide-react'

const ROLE_DISPLAY = {
  reception: { label: 'Réception', Icon: Bell },
  kitchen: { label: 'Cuisine', Icon: ChefHat },
}

export default function StaffOnboarding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [tokenData, setTokenData] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [error, setError] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const { theme, darkMode, toggleDarkMode } = useTheme(restaurant?.primary_color)

  useEffect(() => {
    async function verifyToken() {
      const { data, error } = await supabase
        .from('staff_invitation_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('Lien invalide ou introuvable.')
        setChecking(false)
        return
      }

      if (data.used) {
        setError('Ce lien a déjà été utilisé.')
        setChecking(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Ce lien a expiré.')
        setChecking(false)
        return
      }

      setTokenData(data)

      // Identité visuelle du restaurant pour cohérence — même principe qu'Onboarding.jsx
      const { data: resto } = await supabase
        .from('restaurants')
        .select('name, primary_color, secondary_color, logo_url')
        .eq('id', data.restaurant_id)
        .single()
      setRestaurant(resto || null)

      setChecking(false)
    }
    verifyToken()
  }, [token])

  async function handleCreateAccount() {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email)) {
      setError('Email invalide')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Minimum 6 caractères')
      return
    }
    setCreating(true)
    setError(null)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email, password
    })

    if (signUpError) {
      setError(signUpError.message)
      setCreating(false)
      return
    }

    const { data: tokenUsed, error: rpcError } = await supabase.rpc('use_staff_invitation_token', {
      p_token: token,
      p_user_id: signUpData.user.id,
    })

    if (rpcError || !tokenUsed) {
      setError('Ce lien a déjà été utilisé ou a expiré entre-temps.')
      setCreating(false)
      return
    }

    setCreating(false)
    navigate(tokenData.role === 'kitchen' ? '/kitchen' : '/dashboard')
  }

  if (checking) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.primary, fontFamily: 'Georgia, serif' }}>Vérification du lien...</p>
    </div>
  )

  if (error && !tokenData) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <Lock size={48} color={theme.primary} style={{ margin: '0 0 18px' }} />
        <p style={{ color: theme.primary, fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 'bold' }}>{error}</p>
        <p style={{ color: theme.textSecondary, fontSize: '0.85rem', marginTop: '10px' }}>
          Contactez le propriétaire du restaurant pour obtenir un nouveau lien.
        </p>
      </div>
    </div>
  )

  const roleInfo = ROLE_DISPLAY[tokenData?.role] || ROLE_DISPLAY.reception

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${restaurant?.primary_color || theme.primary}, ${(restaurant?.primary_color || theme.primary)}CC)`,
        padding: '36px 20px 28px', textAlign: 'center', position: 'relative'
      }}>
        <button
          onClick={toggleDarkMode}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
            padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            position: 'absolute', top: '18px', right: '18px'
          }}
        >
          {darkMode ? <Sun size={16} color="#fff" /> : <Moon size={16} color="#fff" />}
        </button>

        {restaurant?.logo_url && (
          <img
            src={restaurant.logo_url}
            alt="logo"
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: `2px solid ${restaurant.secondary_color || '#fff'}` }}
          />
        )}

        <p style={{ color: restaurant?.secondary_color || '#C9A84C', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
          Bienvenue dans l'équipe
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontFamily: 'Georgia, serif', margin: '0 0 12px' }}>
          {restaurant?.name || 'Restaurant'}
        </h1>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: 'rgba(255,255,255,0.18)', borderRadius: '999px', padding: '7px 16px',
          color: '#fff', fontSize: '0.82rem', fontWeight: '600'
        }}>
          <roleInfo.Icon size={15} /> Accès {roleInfo.label}
        </div>
      </div>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '36px 20px' }}>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px' }}>
            <p style={{ color: '#cc0000', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: theme.primary, fontSize: '1.25rem', marginBottom: '8px' }}>
          Créez votre compte
        </h2>
        <p style={{ color: theme.textSecondary, fontSize: '0.82rem', marginBottom: '28px' }}>
          Vous aurez accès au dashboard {roleInfo.label.toLowerCase()} de {restaurant?.name || 'ce restaurant'} depuis ce compte.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '13px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Mot de passe</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '13px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Confirmer le mot de passe</label>
          <input
            type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '13px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleCreateAccount}
          disabled={!email || !password || !confirmPassword || creating}
          style={{
            width: '100%', background: theme.primary, color: '#fff', border: 'none',
            borderRadius: '14px', padding: '15px', fontWeight: 'bold', fontSize: '0.95rem',
            cursor: 'pointer', opacity: (!email || !password || !confirmPassword || creating) ? 0.6 : 1
          }}
        >
          {creating ? 'Création...' : `Créer mon compte ${roleInfo.label} →`}
        </button>
      </div>
    </div>
  )
}