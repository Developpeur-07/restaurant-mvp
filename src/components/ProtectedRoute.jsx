import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useSessionGuard from '../hooks/useSessionGuard'

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined)

  // Un seul appareil actif par compte. Monté ici plutôt que dans chaque page :
  // toute route protégée est surveillée, sans qu'on puisse l'oublier.
  useSessionGuard()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  if (user === undefined) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'black', fontFamily: 'Georgia, serif' }}>Vérification...</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return children
}