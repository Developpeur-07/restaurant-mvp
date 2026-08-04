import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { ArrowLeft, Sun, Moon, Check, Copy } from 'lucide-react'

export default function AdminInvite() {
  const navigate = useNavigate()
  const [restaurantName, setRestaurantName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  // ── THÈME — couleur système par défaut, dark mode fonctionnel ──
  const { theme, darkMode, toggleDarkMode } = useTheme('#1F2A44')

  useEffect(() => {
    fetchTokens()
  }, [])

  async function fetchTokens() {
    const { data } = await supabase
      .from('invitation_tokens')
      .select('*')
      .order('created_at', { ascending: false })
    setTokens(data || [])
    setLoading(false)
  }

  async function generateToken() {
    const cleanName = restaurantName.trim().slice(0, 60).replace(/[<>{}]/g, '')
    if (!cleanName) return
    setGenerating(true)

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error } = await supabase
      .from('invitation_tokens')
      .insert({
        token,
        restaurant_name: cleanName,
        expires_at: expiresAt.toISOString()
      })

    if (!error) {
      setRestaurantName('')
      fetchTokens()
    }
    setGenerating(false)
  }

  function copyLink(token, id) {
    const url = `${window.location.origin}/onboarding/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.primary, fontFamily: 'Georgia, serif' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh' }}>

      <div style={{
        background: `linear-gradient(135deg, ${theme.primary}CC, ${theme.primary})`,
        padding: '32px 20px 28px'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '9px 14px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={15} /> Retour
            </button>
            <div>
              <p style={{ color: '#C9A84C', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                Super Admin
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.4rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                Inviter un restaurant
              </h1>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '9px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            {darkMode ? <Sun size={16} color="#fff" /> : <Moon size={16} color="#fff" />}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '28px 18px' }}>

        {/* GÉNÉRATEUR */}
        <div style={{ background: theme.cardBackground, borderRadius: '20px', padding: '24px', marginBottom: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: theme.textPrimary, fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 16px' }}>
            Nouveau lien d'invitation
          </h2>
          <input
            type="text"
            placeholder="Nom du restaurant (ex: Chez Marie)"
            value={restaurantName}
            onChange={e => setRestaurantName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateToken()}
            style={{
              width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '12px',
              padding: '13px 15px', fontSize: '0.9rem', background: theme.pageBackground,
              color: theme.textPrimary, outline: 'none', boxSizing: 'border-box', marginBottom: '14px'
            }}
          />
          <button
            onClick={generateToken}
            disabled={!restaurantName.trim() || generating}
            style={{
              width: '100%', background: theme.primary, color: '#fff', border: 'none',
              borderRadius: '12px', padding: '13px', fontWeight: 'bold',
              fontSize: '0.88rem', cursor: 'pointer',
              opacity: (!restaurantName.trim() || generating) ? 0.6 : 1
            }}
          >
            {generating ? 'Génération...' : '+ Générer le lien'}
          </button>
        </div>

        {/* LISTE DES TOKENS */}
        <h2 style={{ color: theme.primary, fontFamily: 'Georgia, serif', fontSize: '0.95rem', margin: '0 0 14px' }}>
          Invitations ({tokens.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tokens.map(t => {
            const isExpired = new Date(t.expires_at) < new Date()
            return (
              <div key={t.id} style={{
                background: theme.cardBackground, borderRadius: '16px', padding: '16px 18px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.10)',
                opacity: (t.used || isExpired) ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.9rem' }}>
                      {t.restaurant_name}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: theme.textSecondary }}>
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '600', padding: '4px 10px', borderRadius: '14px',
                    background: t.used ? '#F3F4F6' : isExpired ? '#fee2e2' : '#DCFCE7',
                    color: t.used ? '#6B7280' : isExpired ? '#dc2626' : '#166534',
                    whiteSpace: 'nowrap',
                  }}>
                    {t.used ? 'Utilisé' : isExpired ? 'Expiré' : 'Actif'}
                  </span>
                </div>

                {!t.used && !isExpired && (
                  <button
                    onClick={() => copyLink(t.token, t.id)}
                    style={{
                      width: '100%', background: theme.pageBackground, border: `1px solid ${theme.borderLight}`,
                      borderRadius: '10px', padding: '11px', color: theme.primary,
                      fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {copiedId === t.id ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}