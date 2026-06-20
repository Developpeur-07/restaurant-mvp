import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function AdminInvite() {
  const navigate = useNavigate()
  const [restaurantName, setRestaurantName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

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
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh' }}>

      <div style={{
        background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
        padding: '28px 20px 24px'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ← Retour
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
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

        {/* GÉNÉRATEUR */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(139,0,0,0.08)' }}>
          <h2 style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 14px' }}>
            Nouveau lien d'invitation
          </h2>
          <input
            type="text"
            placeholder="Nom du restaurant (ex: Chez Marie)"
            value={restaurantName}
            onChange={e => setRestaurantName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateToken()}
            style={{
              width: '100%', border: '2px solid #e8ddd4', borderRadius: '10px',
              padding: '12px 14px', fontSize: '0.9rem', background: '#FFF8F0',
              outline: 'none', boxSizing: 'border-box', marginBottom: '12px'
            }}
          />
          <button
            onClick={generateToken}
            disabled={!restaurantName.trim() || generating}
            style={{
              width: '100%', background: '#8B0000', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '12px', fontWeight: 'bold',
              fontSize: '0.88rem', cursor: 'pointer',
              opacity: (!restaurantName.trim() || generating) ? 0.6 : 1
            }}
          >
            {generating ? 'Génération...' : '+ Générer le lien'}
          </button>
        </div>

        {/* LISTE DES TOKENS */}
        <h2 style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '0.95rem', margin: '0 0 12px' }}>
          Invitations ({tokens.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tokens.map(t => {
            const isExpired = new Date(t.expires_at) < new Date()
            return (
              <div key={t.id} style={{
                background: '#fff', borderRadius: '12px', padding: '14px 16px',
                boxShadow: '0 1px 4px rgba(139,0,0,0.06)',
                borderLeft: `4px solid ${t.used ? '#6B7280' : isExpired ? '#dc2626' : '#166534'}`,
                opacity: (t.used || isExpired) ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#1a1a1a', fontSize: '0.9rem' }}>
                      {t.restaurant_name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#999' }}>
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '600', padding: '3px 8px', borderRadius: '12px',
                    background: t.used ? '#F3F4F6' : isExpired ? '#fee2e2' : '#DCFCE7',
                    color: t.used ? '#6B7280' : isExpired ? '#dc2626' : '#166534'
                  }}>
                    {t.used ? 'Utilisé' : isExpired ? 'Expiré' : 'Actif'}
                  </span>
                </div>

                {!t.used && !isExpired && (
                  <button
                    onClick={() => copyLink(t.token, t.id)}
                    style={{
                      width: '100%', background: '#FFF8F0', border: '1px solid #e8ddd4',
                      borderRadius: '8px', padding: '10px', color: '#8B0000',
                      fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    {copiedId === t.id ? '✓ Copié !' : '📋 Copier le lien'}
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