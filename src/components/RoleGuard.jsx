// src/components/RoleGuard.jsx
//
// Filtre d'accès par rôle, posé devant les pages d'administration.
//
// Avant ce composant, <AdminRoute> ne vérifiait QUE la présence d'une session :
// n'importe quel compte — y compris la cuisine — pouvait ouvrir /dashboard et
// consulter le chiffre d'affaires en tapant l'URL. Ce garde corrige ça.
//
// Par défaut : les comptes `kitchen` sont renvoyés vers /kitchen.
// Propriétaire (restaurants.owner_id) et réception passent.

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RoleGuard({ deny = ['kitchen'], redirectTo = '/kitchen', children }) {
  const [allowed, setAllowed] = useState(undefined)

  useEffect(() => {
    let alive = true

    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (alive) setAllowed(false)
        return
      }

      // Un compte propriétaire n'a pas forcément de ligne restaurant_staff :
      // l'absence de ligne ne doit donc jamais être un motif de refus.
      const { data: staffRow, error } = await supabase
        .from('restaurant_staff')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!alive) return

      if (error) {
        console.error('RoleGuard: lecture restaurant_staff', error)
        // En cas de doute on laisse passer : AdminRoute enchaîne sur
        // SubscriptionProvider qui refusera l'accès si aucun restaurant n'est
        // rattaché au compte.
        setAllowed(true)
        return
      }

      setAllowed(!staffRow || !deny.includes(staffRow.role))
    }

    checkRole()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (allowed === undefined) {
    return (
      <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'black', fontFamily: 'Georgia, serif' }}>Vérification...</p>
      </div>
    )
  }

  if (!allowed) return <Navigate to={redirectTo} replace />

  return children
}
