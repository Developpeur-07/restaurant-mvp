import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { useSubscription } from '../hooks/useSubscription'
import { BarChart3, ShoppingBag, UtensilsCrossed, Receipt } from 'lucide-react'
import ReceiptModal from '../components/ReceiptModal'
import PageHeader from '../components/PageHeader'
import PageLoader from '../components/PageLoader'
import { ADMIN_CSS, adminVars } from '../lib/adminCss'

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

  if (contextLoading || loading) return <PageLoader theme={theme} />

  if (!restaurantId) return (
    <div className="adm-page adm-loader" style={adminVars(theme, restaurantBrand)}>
      <style>{ADMIN_CSS}</style>
      <p className="adm-loader-label">
        Ce compte n'a pas accès à l'historique.
      </p>
    </div>
  )

  return (
    <>
      <div
        className={`adm-page ${selectedReceipt ? 'dashboard-print-hide' : ''}`}
        style={adminVars(theme, restaurantBrand)}
      >
      <style>{ADMIN_CSS}</style>

      <PageHeader
        brand={restaurantBrand}
        theme={theme}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onBack={() => navigate('/dashboard')}
        subtitle="Historique"
        title="Ventes soldées"
      />

      <div className="adm-wrap">

        {/* TOTAL */}
        <div className="adm-hero">
          <p className="adm-hero-label">Total encaissé</p>
          <p className="adm-hero-value">{total.toLocaleString()} FCFA</p>
          <p className="adm-hero-sub">{orders.length} commande(s) soldée(s)</p>
        </div>

        {orders.length === 0 ? (
          <div className="adm-empty" style={{ color: theme.textSecondary }}>
            <BarChart3 size={48} style={{ margin: '0 0 14px' }} />
            <p style={{ fontFamily: 'Georgia, serif' }}>Aucune vente enregistrée</p>
          </div>
        ) : (
          <div className="adm-list">
            {orders.map(order => {
              const orderTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
              return (
                <div key={order.id} className="adm-card">
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
                      <div key={i} className="adm-line">
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