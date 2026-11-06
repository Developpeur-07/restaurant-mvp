import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { useSubscription } from '../hooks/useSubscription'
import { ArrowLeft, Sun, Moon, BarChart3, ShoppingBag, UtensilsCrossed, Receipt } from 'lucide-react'
import ReceiptModal from '../components/ReceiptModal'
import { ADMIN_CSS } from '../lib/adminCss'

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
        className={`adm-page ${selectedReceipt ? 'dashboard-print-hide' : ''}`}
        style={{
          "--adm-page": theme.pageBackground,
          "--adm-card": theme.cardBackground,
          "--adm-text": theme.textPrimary,
          "--adm-text-2": theme.textSecondary,
          "--adm-muted": theme.textMuted,
          "--adm-border": theme.borderLight,
          "--adm-primary": theme.primary,
          "--adm-accent": restaurantBrand?.secondary_color || "#C9A84C",
        }}
      >
      <style>{ADMIN_CSS}</style>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}CC, ${primaryColor})`,
        padding: '24px 20px'
      }}>
        <div className="adm-header-inner">
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