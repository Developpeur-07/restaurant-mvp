import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function History() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (!resto) return

      const { data } = await supabase
        .from('orders_archive')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setOrders(data || [])
      const sum = (data || []).reduce((s, o) =>
        s + o.items.reduce((a, i) => a + i.price * i.qty, 0), 0)
      setTotal(sum)
      setLoading(false)
    }
    fetch()
  }, [])

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
              Historique
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.4rem', fontFamily: 'Georgia, serif', margin: 0 }}>
              Ventes soldées
            </h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

        {/* TOTAL */}
        <div style={{ background: '#8B0000', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Total encaissé
          </p>
          <p style={{ color: '#C9A84C', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: 0 }}>
            {total.toLocaleString()} FCFA
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', margin: '4px 0 0' }}>
            {orders.length} commande(s) soldée(s)
          </p>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#bbb' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 12px' }}>📊</p>
            <p style={{ fontFamily: 'Georgia, serif' }}>Aucune vente enregistrée</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map(order => {
              const orderTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
              return (
                <div key={order.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(139,0,0,0.06)', borderLeft: '4px solid #C9A84C' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#8B0000', fontFamily: 'Georgia, serif' }}>
                        Table {order.table_number}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#999' }}>
                        {new Date(order.created_at).toLocaleDateString('fr-FR')} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '1rem' }}>
                      {orderTotal.toLocaleString()} FCFA
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid #f0e8de', paddingTop: '10px' }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: '#555' }}><span style={{ color: '#8B0000', fontWeight: 'bold' }}>{item.qty}×</span> {item.name}</span>
                        <span style={{ color: '#999' }}>{(item.price * item.qty).toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}