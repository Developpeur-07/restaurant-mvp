import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { useSubscription } from '../hooks/useSubscription'
import { ArrowLeft, Sun, Moon, BarChart3, ShoppingBag, UtensilsCrossed, Receipt } from 'lucide-react'
import ReceiptModal from '../components/ReceiptModal'

export default function History() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // ── ABONNEMENT + RESTAURANT — résout owner OU réception, source unique.
  // History.jsx ne fait plus sa propre requête owner_id en doublon (c'était
  // la cause du blocage/406 pour un compte réception).
  const {
    restaurantId, restaurantName, restaurantBrand,
    loading: contextLoading,
  } = useSubscription()

  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const primaryColor = restaurantBrand?.primary_color || '#1F2A44'
  const { theme, darkMode, toggleDarkMode } = useTheme(primaryColor)

  useEffect(() => {
    if (contextLoading) return

    if (!restaurantId) {
      queueMicrotask(() => setLoading(false))
      return
    }

    let cancelled = false

    async function fetchOrders() {
      const { data } = await supabase
        .from('orders_archive')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return

      setOrders(data || [])
      const sum = (data || []).reduce((s, o) =>
        s + o.items.reduce((a, i) => a + i.price * i.qty, 0), 0)
      setTotal(sum)
      setLoading(false)
    }

    fetchOrders()

    return () => { cancelled = true }
  }, [contextLoading, restaurantId])

  if (contextLoading || loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.textSecondary, fontFamily: 'Georgia, serif' }}>Chargement...</p>
    </div>
  )

  if (!restaurantId) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <p style={{ color: theme.textPrimary, textAlign: 'center' }}>
        Ce compte n'a pas accès à l'historique.
      </p>
    </div>
  )

  return (
    <>
      <div
        className={selectedReceipt ? 'dashboard-print-hide' : ''}
        style={{ background: theme.pageBackground, minHeight: '100vh' }}
      >

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}CC, ${primaryColor})`,
        padding: '24px 20px'
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
                Historique
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.4rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                Ventes soldées
              </h1>
            </div>
          </div>
          <button onClick={toggleDarkMode} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '9px 11px', cursor: 'pointer' }}>
            {darkMode ? <Sun size={16} color="#fff" /> : <Moon size={16} color="#fff" />}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '28px 18px' }}>

        {/* TOTAL */}
        <div style={{ background: theme.primary, borderRadius: '20px', padding: '24px', textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: '0 0 6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Total encaissé
          </p>
          <p style={{ color: '#C9A84C', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', margin: 0 }}>
            {total.toLocaleString()} FCFA
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', margin: '6px 0 0' }}>
            {orders.length} commande(s) soldée(s)
          </p>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: theme.textSecondary }}>
            <BarChart3 size={48} style={{ margin: '0 0 14px' }} />
            <p style={{ fontFamily: 'Georgia, serif' }}>Aucune vente enregistrée</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {orders.map(order => {
              const orderTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
              return (
                <div key={order.id} style={{ background: theme.cardBackground, borderRadius: '16px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {order.order_type === 'emporter'
                          ? <><ShoppingBag size={15} /> {order.customer_name}</>
                          : <><UtensilsCrossed size={15} /> Table {order.table_number}</>}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: theme.textSecondary }}>
                        {new Date(order.created_at).toLocaleDateString('fr-FR')} · {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '1rem' }}>
                      {orderTotal.toLocaleString()} FCFA
                    </p>
                  </div>
                  <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: '14px' }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span style={{ color: theme.textPrimary }}><span style={{ color: theme.textPrimary, fontWeight: 'bold' }}>{item.qty}×</span> {item.name}</span>
                        <span style={{ color: theme.textSecondary }}>{(item.price * item.qty).toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px dashed ${theme.borderLight}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedReceipt({
                        tableNumber: order.table_number,
                        sessionNumber: order.session_id ? String(order.session_id).slice(-4) : null,
                        items: order.items,
                        total: orderTotal,
                        closedAt: order.created_at,
                      })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: `1px solid ${theme.borderLight}`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        color: theme.textPrimary,
                        cursor: 'pointer',
                      }}
                    >
                      <Receipt size={14} /> Imprimer reçu
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>

      {/* REÇU HISTORIQUE RESPONSIVE & IMPRIMABLE */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          brand={{
            name: restaurantName || 'Restaurant',
            primary_color: primaryColor,
            secondary_color: restaurantBrand?.secondary_color || '#C9A84C',
            logo_url: restaurantBrand?.logo_url || '',
          }}
          theme={theme}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </>
  )
}