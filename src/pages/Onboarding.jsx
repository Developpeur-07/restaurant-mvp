import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { Lock, Sun, Moon } from 'lucide-react'

export default function Onboarding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [tokenData, setTokenData] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1)

  // Étape 1 — compte
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [creating, setCreating] = useState(false)

  // Étape 2 — identité
  const [restaurantId, setRestaurantId] = useState(null)
  const [brand, setBrand] = useState({
    name: '', primary_color: '#8B0000', secondary_color: '#C9A84C', slogan: '', address: ''
  })
  const [savingBrand, setSavingBrand] = useState(false)

  // Étape 3 — premier plat
  const [firstItem, setFirstItem] = useState({ name: '', price: '', estimated_minutes: '' })
  const [savingItem, setSavingItem] = useState(false)

  // ── THÈME — suit en live la couleur choisie par le restaurateur à l'étape 2 ──
  const { theme, darkMode, toggleDarkMode } = useTheme(brand.primary_color)

  useEffect(() => {
    async function verifyToken() {
      const { data, error } = await supabase
        .from('invitation_tokens')
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
      setBrand(prev => ({ ...prev, name: data.restaurant_name || '' }))
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

    const { data: resto, error: restoError } = await supabase
      .from('restaurants')
      .insert({
        name: tokenData.restaurant_name,
        owner_id: signUpData.user.id
      })
      .select()
      .single()

    if (restoError) {
      setError('Erreur création restaurant: ' + restoError.message)
      setCreating(false)
      return
    }

    const { data: tokenUsed } = await supabase.rpc('use_invitation_token', { p_token: token })

    if (!tokenUsed) {
      setError('Ce lien a déjà été utilisé par quelqu\'un d\'autre.')
      setCreating(false)
      return
    }

    setRestaurantId(resto.id)
    setCreating(false)
    setStep(2)
  }

  async function handleSaveBrand() {
    setSavingBrand(true)
    await supabase
      .from('restaurants')
      .update({
        name: brand.name,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
        slogan: brand.slogan,
        address: brand.address
      })
      .eq('id', restaurantId)
    setSavingBrand(false)
    setStep(3)
  }

  async function handleSaveFirstItem() {
    if (!firstItem.name || !firstItem.price || !firstItem.estimated_minutes) return
    setSavingItem(true)
    await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name: firstItem.name,
        price: parseInt(firstItem.price),
        estimated_minutes: parseInt(firstItem.estimated_minutes),
        available: true
      })
    setSavingItem(false)
    navigate('/dashboard')
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
          Contactez votre administrateur pour obtenir un nouveau lien.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color}CC)`,
        padding: '36px 20px 28px', textAlign: 'center', position: 'relative'
      }}>
        <button
          onClick={toggleDarkMode}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
            padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            position: 'absolute', top: '18px', right: '18px', flexShrink: 0
          }}
        >
          {darkMode ? <Sun size={16} color="#fff" /> : <Moon size={16} color="#fff" />}
        </button>

        <p style={{ color: brand.secondary_color, fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
          Bienvenue
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontFamily: 'Georgia, serif', margin: '0 0 14px' }}>
          {tokenData?.restaurant_name}
        </h1>

        {/* PROGRESSION */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '9px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: '32px', height: '4px', borderRadius: '4px',
              background: s <= step ? brand.secondary_color : 'rgba(255,255,255,0.3)'
            }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '36px 20px' }}>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px' }}>
            <p style={{ color: '#cc0000', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ÉTAPE 1 — COMPTE */}
        {step === 1 && (
          <>
            <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: theme.primary, fontSize: '1.25rem', marginBottom: '8px' }}>
              Créez votre compte
            </h2>
            <p style={{ color: theme.textSecondary, fontSize: '0.82rem', marginBottom: '28px' }}>
              Vous gérerez {tokenData?.restaurant_name} depuis ce compte.
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
              {creating ? 'Création...' : 'Créer mon compte →'}
            </button>
          </>
        )}

        {/* ÉTAPE 2 — IDENTITÉ */}
        {step === 2 && (
          <>
            <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: theme.primary, fontSize: '1.25rem', marginBottom: '8px' }}>
              Votre identité visuelle
            </h2>
            <p style={{ color: theme.textSecondary, fontSize: '0.82rem', marginBottom: '28px' }}>
              Personnalisez les couleurs de votre menu. Modifiable à tout moment.
            </p>

            {/* PREVIEW — live selon les couleurs choisies */}
            <div style={{ background: brand.primary_color, borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: brand.secondary_color, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
                {brand.slogan || 'Votre slogan'}
              </p>
              <p style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', fontWeight: 'bold', margin: 0 }}>
                {brand.name}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Nom du restaurant</label>
              <input
                type="text" value={brand.name} onChange={e => setBrand(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Slogan</label>
              <input
                type="text" value={brand.slogan} onChange={e => setBrand(prev => ({ ...prev, slogan: e.target.value }))}
                placeholder="Ex: Le goût de l'authentique"
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Adresse</label>
              <input
                type="text" value={brand.address} onChange={e => setBrand(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ex: Marché Moungali, Brazzaville"
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Couleur principale', key: 'primary_color' },
                { label: 'Couleur accent', key: 'secondary_color' },
              ].map(f => (
                <div key={f.key} style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>{f.label}</label>
                  <input
                    type="color" value={brand[f.key]}
                    onChange={e => setBrand(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: `2px solid ${theme.borderLight}`, cursor: 'pointer', padding: '2px' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveBrand}
              disabled={!brand.name || savingBrand}
              style={{
                width: '100%', background: theme.primary, color: '#fff', border: 'none',
                borderRadius: '14px', padding: '15px', fontWeight: 'bold', fontSize: '0.95rem',
                cursor: 'pointer', opacity: (!brand.name || savingBrand) ? 0.6 : 1
              }}
            >
              {savingBrand ? 'Sauvegarde...' : 'Continuer →'}
            </button>
          </>
        )}

        {/* ÉTAPE 3 — PREMIER PLAT */}
        {step === 3 && (
          <>
            <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: theme.primary, fontSize: '1.25rem', marginBottom: '8px' }}>
              Ajoutez votre premier plat
            </h2>
            <p style={{ color: theme.textSecondary, fontSize: '0.82rem', marginBottom: '28px' }}>
              Vous pourrez ajouter tout le reste de votre menu depuis votre tableau de bord.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Nom du plat</label>
              <input
                type="text" value={firstItem.name}
                onChange={e => setFirstItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Poulet braisé"
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Prix (FCFA)</label>
              <input
                type="number" value={firstItem.price}
                onChange={e => setFirstItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Ex: 2500"
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '8px', fontWeight: '600' }}>Temps de préparation (min)</label>
              <input
                type="number" value={firstItem.estimated_minutes}
                onChange={e => setFirstItem(prev => ({ ...prev, estimated_minutes: e.target.value }))}
                placeholder="Ex: 15"
                style={{ width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px', padding: '12px 15px', fontSize: '0.9rem', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleSaveFirstItem}
              disabled={!firstItem.name || !firstItem.price || !firstItem.estimated_minutes || savingItem}
              style={{
                width: '100%', background: theme.primary, color: '#fff', border: 'none',
                borderRadius: '14px', padding: '15px', fontWeight: 'bold', fontSize: '0.95rem',
                cursor: 'pointer', marginBottom: '14px',
                opacity: (!firstItem.name || !firstItem.price || !firstItem.estimated_minutes || savingItem) ? 0.6 : 1
              }}
            >
              {savingItem ? 'Finalisation...' : 'Terminer et accéder au tableau de bord →'}
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              style={{ width: '100%', background: 'none', border: 'none', color: theme.textSecondary, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Passer cette étape
            </button>
          </>
        )}
      </div>
    </div>
  )
}