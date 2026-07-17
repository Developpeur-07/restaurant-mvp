import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SuperAdminRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(undefined)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthorized(user?.app_metadata?.role === 'super_admin')
    })
  }, [])

  if (isAuthorized === undefined) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'black', fontFamily: 'Georgia, serif' }}>Vérification...</p>
    </div>
  )
  if (!isAuthorized) return <Navigate to="/dashboard" replace />
  return children
}