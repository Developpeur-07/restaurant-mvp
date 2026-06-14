import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpdate() {
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Minimum 6 caractères')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erreur lors de la mise à jour')
      setLoading(false)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
        padding: '40px 20px 32px', textAlign: 'center'
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontFamily: 'Georgia, serif', margin: 0 }}>
          Nouveau mot de passe
        </h1>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ color: '#cc0000', fontSize: '0.82rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', border: '2px solid #e8ddd4', borderRadius: '10px',
                padding: '12px 14px', fontSize: '0.9rem', background: '#fff',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
              Confirmer
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{
                width: '100%', border: '2px solid #e8ddd4', borderRadius: '10px',
                padding: '12px 14px', fontSize: '0.9rem', background: '#fff',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={handleUpdate}
            disabled={!password || !confirm || loading}
            style={{
              width: '100%', background: '#8B0000', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '14px', fontWeight: 'bold',
              fontSize: '0.95rem', cursor: 'pointer',
              opacity: (!password || !confirm || loading) ? 0.6 : 1
            }}
          >
            {loading ? 'Mise à jour...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}