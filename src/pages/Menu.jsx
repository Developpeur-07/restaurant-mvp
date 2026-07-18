import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { Search as SearchIcon, X as XIcon, Menu as BurgerIcon } from 'lucide-react'

const CATEGORIES = [
  { label: 'Croissanterie', emoji: '🥐', keywords: ['croissant', 'donuts', 'madeleine', 'pain', 'pudding', 'chausson', 'flan', 'brioche', 'palmier', 'sable', 'allumette', 'jesuite', 'cornet', 'paille', 'andalou', 'feuillette', 'jalousie', 'pic'] },
  { label: 'Gâteaux', emoji: '🎂', keywords: ['moka', 'lunette', 'boutonnier', 'cake', 'tarte', 'maria'] },
  { label: 'Crêpes', emoji: '🫓', keywords: ['crêpe', 'crepe'] },
  { label: 'Hamburgers', emoji: '🍔', keywords: ['hamburger', 'big burger', 'assiette hb'] },
  { label: 'Sandwichs', emoji: '🥖', keywords: ['sandwich', 'chawarma', 'bog dog'] },
  { label: 'Petit Déjeuner', emoji: '🍳', keywords: ['œuf', 'omelette'] },
  { label: 'Volailles', emoji: '🍗', keywords: ['poulet', 'yassa', 'demi-poulet'] },
  { label: 'Viandes', emoji: '🥩', keywords: ['steak', 'brochette de bœuf', 'saucisse'] },
  { label: 'KFC', emoji: '🍟', keywords: ['ailes', 'trio', 'ailerons'] },
  { label: 'Poissons', emoji: '🐟', keywords: ['poisson', 'carpe', 'bar', 'likouf', 'sole', 'fillet'] },
  { label: 'Pizza', emoji: '🍕', keywords: ['pizza'] },
  { label: 'Salades', emoji: '🥗', keywords: ['salade', 'verte', 'choux', 'mixte', 'avocat', 'nicoise', 'niçoise', 'tomate', 'pomme de terre'] },
  { label: 'Accompagnements', emoji: '🍟', keywords: ['riz', 'banane', 'frites'] },
  { label: 'Thé & Café', emoji: '☕', keywords: ['lait', 'chocolat', 'thé', 'café', 'nescafé', 'expresso'] },
  { label: 'Boissons', emoji: '🥤', keywords: ['orangina', 'yaourt', 'fresco', 'eau', 'coca', 'sprite', 'fanta', 'pulp', 'grenadine', 'reactor', 'tonic', 'jus', 'red bull', 'bavard'] },
  { label: 'Glaces', emoji: '🍦', keywords: ['glace'] },
]

function categorize(items) {
  const result = {}
  const used = new Set()
  CATEGORIES.forEach(cat => {
    const matched = items.filter(item => {
      if (used.has(item.id)) return false
      return cat.keywords.some(k => item.name.toLowerCase().includes(k))
    })
    if (matched.length > 0) {
      matched.forEach(i => used.add(i.id))
      result[cat.label] = { emoji: cat.emoji, items: matched }
    }
  })
  const uncategorized = items.filter(i => !used.has(i.id))
  if (uncategorized.length > 0) result['Autres'] = { emoji: '🍽', items: uncategorized }
  return result
}

function getEmoji(item) {
  return CATEGORIES.find(c => c.keywords.some(k => item.name.toLowerCase().includes(k)))?.emoji || '🍽'
}

// ─── MODALE TYPE DE COMMANDE ───
function OrderModal({ theme, showModal, setShowModal, orderType, setOrderType, tableNumber, setTableNumber, customerName, setCustomerName, submitting, submitOrder }) {
  if (!showModal) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '28px 24px' }}>
        <div style={{ width: '40px', height: '3px', background: theme.borderLight, borderRadius: '2px', margin: '0 auto 20px' }} />
        <h2 style={{ margin: '0 0 6px', fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.2rem' }}>Type de commande</h2>
        <p style={{ margin: '0 0 20px', color: theme.textSecondary, fontSize: '0.8rem' }}>Comment souhaitez-vous recevoir votre commande ?</p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { value: 'sur_place', label: 'Sur place', emoji: '🪑', desc: 'Numéro de table' },
            { value: 'emporter', label: 'À emporter', emoji: '🥡', desc: 'Votre nom' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setOrderType(opt.value)} style={{
              flex: 1, padding: '16px 12px', borderRadius: '14px', cursor: 'pointer',
              border: `2px solid ${orderType === opt.value ? theme.primary : theme.borderLight}`,
              background: orderType === opt.value ? `${theme.primary}1A` : theme.cardBackground,
              textAlign: 'center', transition: 'all 0.2s'
            }}>
              <p style={{ fontSize: '1.8rem', margin: '0 0 6px' }}>{opt.emoji}</p>
              <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem' }}>{opt.label}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: theme.textSecondary }}>{opt.desc}</p>
            </button>
          ))}
        </div>
        {orderType === 'sur_place' ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: theme.primary, marginBottom: '6px', fontWeight: '600' }}>Numéro de table</label>
            <input type="number" placeholder="Ex: 4" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
              style={{ width: '100%', border: `2px solid ${theme.primary}`, borderRadius: '12px', padding: '14px', fontSize: '1.5rem', textAlign: 'center', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: theme.primary, marginBottom: '6px', fontWeight: '600' }}>Votre nom complet</label>
            <input
              type="text"
              placeholder="Ex: Jean"
              maxLength={40}
              value={customerName}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 40);
                setCustomerName(value);
              }}
              style={{ width: '100%', border: `2px solid ${theme.primary}`, borderRadius: '12px', padding: '14px', fontSize: '1.2rem', textAlign: 'center', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowModal(false)} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '12px', padding: '14px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={submitOrder} disabled={orderType === 'sur_place' ? !tableNumber || submitting : !customerName || submitting}
            style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: (orderType === 'sur_place' ? !tableNumber : !customerName) || submitting ? 0.5 : 1 }}>
            {submitting ? 'Envoi...' : 'Confirmer la commande'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MODALE REVIEW PANIER ───
function CartReviewModal({ theme, show, onClose, selectedItems, addItem, removeItem, deleteItemFromCart, total, totalQty, maxMinutes, onConfirm }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
      onClick={onClose}>
      <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '28px 24px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: '40px', height: '3px', background: theme.borderLight, borderRadius: '2px', margin: '0 auto 20px' }} />
        <h2 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.2rem' }}>
          Votre commande
        </h2>
        <p style={{ margin: '0 0 20px', color: theme.textSecondary, fontSize: '0.8rem' }}>
          Vérifiez avant de confirmer — vous pouvez ajuster les quantités
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {selectedItems.map(item => (
            <div key={item.id} style={{
              background: theme.cardBackground, borderRadius: '12px', padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: theme.textSecondary }}>
                  {item.price.toLocaleString()} FCFA · {(item.price * item.qty).toLocaleString()} FCFA
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => removeItem(item.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: theme.pageBackground, border: `1px solid ${theme.borderLight}`, color: theme.textPrimary, fontSize: '1rem', cursor: 'pointer' }}>−</button>
                <span style={{ fontWeight: 'bold', color: theme.primary, minWidth: '18px', textAlign: 'center', fontSize: '0.88rem' }}>{item.qty}</span>
                <button onClick={() => addItem(item)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: theme.primary, border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>+</button>
                <button onClick={() => deleteItemFromCart(item.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '6px 8px', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', marginLeft: '4px' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `2px solid ${theme.primary}`, paddingTop: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: theme.textSecondary, fontSize: '0.85rem' }}>{totalQty} article(s) · ~{maxMinutes} min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', color: theme.textPrimary, fontFamily: 'Georgia, serif' }}>Total</span>
            <span style={{ fontWeight: 'bold', color: theme.primary, fontSize: '1.2rem' }}>{total.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '12px', padding: '14px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
            Continuer mes achats
          </button>
          <button onClick={onConfirm} disabled={selectedItems.length === 0} style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: selectedItems.length === 0 ? 0.5 : 1 }}>
            Confirmer →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Menu() {
  const { restaurantId, category } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [categoryImages, setCategoryImages] = useState({}) // { [label]: image_url }
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState({})
  const [showCartReview, setShowCartReview] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState('sur_place')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [detailItem, setDetailItem] = useState(null)
  const [activeTab, setActiveTab] = useState(category ? decodeURIComponent(category) : null)
  const [burgerOpen, setBurgerOpen] = useState(false)

  const { theme, darkMode, toggleDarkMode } = useTheme(restaurant?.primary_color)

  useEffect(() => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let isMounted = true;

    async function fetchMenu() {
      setLoading(true);

      if (!UUID_REGEX.test(restaurantId)) {
        if (isMounted) { setRestaurant(null); setItems([]); setLoading(false); }
        return;
      }

      try {
        const { data: resto, error: restoError } = await supabase
          .from('restaurants')
          .select('name, primary_color, secondary_color, slogan, address, logo_url')
          .eq('id', restaurantId)
          .single();
        if (restoError) throw restoError;

        const { data: menuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('available', true);
        if (menuError) throw menuError;

        const { data: catRows } = await supabase
          .from('menu_categories')
          .select('label, image_url')
          .eq('restaurant_id', restaurantId);

        if (!isMounted) return;

        setRestaurant(resto || null);
        setItems(menuItems || []);

        const catMap = {}
        ;(catRows || []).forEach(row => { catMap[row.label] = row.image_url })
        setCategoryImages(catMap)

      } catch (error) {
        console.error(error);
        if (isMounted) { setRestaurant(null); setItems([]); }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMenu();
    return () => { isMounted = false; };
  }, [restaurantId]);

  useEffect(() => {
    if (Object.keys(selection).length > 0) {
      localStorage.setItem(`selection_${restaurantId}`, JSON.stringify(selection))
    } else {
      localStorage.removeItem(`selection_${restaurantId}`)
    }
  }, [selection, restaurantId])

  function addItem(item) {
    setSelection(prev => {
      const currentQty = prev[item.id]?.qty || 0
      if (currentQty >= 20) return prev
      return { ...prev, [item.id]: { ...item, qty: currentQty + 1 } }
    })
  }

  function removeItem(itemId) {
    setSelection(prev => {
      const qty = (prev[itemId]?.qty || 0) - 1
      if (qty <= 0) { const next = { ...prev }; delete next[itemId]; return next }
      return { ...prev, [itemId]: { ...prev[itemId], qty } }
    })
  }

  function deleteItemFromCart(itemId) {
    setSelection(prev => { const next = { ...prev }; delete next[itemId]; return next })
  }

  function validateTableNumber(value) {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1 || num > 999) return null
    return num
  }

  async function submitOrder() {
    if (submitting) return
    const validTable = validateTableNumber(tableNumber)
    if (orderType === 'sur_place' && !validTable) { alert('Numéro de table invalide'); return }
    setSubmitting(true)

    const selectedItems = Object.values(selection)
    const maxMinutes = Math.max(...selectedItems.map(i => i.estimated_minutes))
    const estimatedReadyAt = new Date(Date.now() + maxMinutes * 60 * 1000)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_number: orderType === 'sur_place' ? validTable : null,
        customer_name: orderType === 'emporter' ? customerName : null,
        order_type: orderType,
        items: selectedItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        status: 'received',
        estimated_ready_at: estimatedReadyAt.toISOString()
      })
      .select().single()

    if (error) { alert('Erreur lors de la commande. Réessaie.'); setSubmitting(false); return }

    localStorage.removeItem(`selection_${restaurantId}`)
    navigate(`/tracking/${data.id}`)
  }

  const selectedItems = Object.values(selection)
  const total = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0)
  const maxMinutes = selectedItems.length ? Math.max(...selectedItems.map(i => i.estimated_minutes)) : 0
  const categorized = categorize(items)
  const categoryLabels = Object.keys(categorized)

  // Onglet actif par défaut = premier disponible (ou celui de l'URL s'il existe encore)
  const currentTab = (activeTab && categorized[activeTab]) ? activeTab : categoryLabels[0]
  const catData = categorized[currentTab]
  const catItems = catData?.items || []
  const filteredItems = search.trim()
    ? catItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : catItems

  if (loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.textPrimary, fontFamily: 'Georgia, serif' }}>Chargement du menu...</p>
    </div>
  )

  if (!restaurant) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.textPrimary }}>Restaurant introuvable.</p>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '100px' : '40px' }}>

      {/* Masque la scrollbar des onglets horizontaux + media queries responsive */}
      <style>{`
        .category-tabs-scroll::-webkit-scrollbar { display: none }
        .category-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none }
        @media (max-width: 429px) {
          .menu-desktop-controls { display: none !important; }
          .menu-burger-btn { display: flex !important; }
        }
      `}</style>

      {/* HEADER — logo grand + nom du restaurant en avant */}
      <div style={{
        background: `linear-gradient(135deg, ${restaurant.primary_color || theme.primary}, ${restaurant.primary_color || theme.primary}CC)`,
        padding: '20px 20px 16px',
        position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="logo" style={{
                width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${restaurant.secondary_color || '#fff'}`, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }} />
            ) : <div style={{ width: '58px' }} />}

            <div style={{ flex: 1, minWidth: 0 }}>
              {restaurant.slogan && (
                <p style={{ color: restaurant.secondary_color || '#C9A84C', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
                  {restaurant.slogan}
                </p>
              )}
              <h1 style={{ color: '#fff', fontSize: '1.55rem', fontFamily: 'Georgia, serif', margin: 0, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {restaurant.name}
              </h1>
            </div>

            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button className="menu-desktop-controls" onClick={toggleDarkMode} style={{ display: 'flex', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '9px 11px', cursor: 'pointer', fontSize: '0.95rem' }}>
                {darkMode ? '☀️' : '🌙'}
              </button>

              {/* Burger — n'apparaît que sous 429px, regroupe dark mode + onglets catégories */}
              <button
                className="menu-burger-btn"
                onClick={() => setBurgerOpen(o => !o)}
                style={{ display: 'none', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '9px 10px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
              >
                <BurgerIcon size={19} color="#fff" />
              </button>

              {burgerOpen && (
                <>
                  <div onClick={() => setBurgerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 60,
                    background: theme.cardBackground, borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '210px',
                    maxHeight: '70vh', overflowY: 'auto'
                  }}>
                    <button
                      onClick={() => { toggleDarkMode(); setBurgerOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 10px', color: theme.textPrimary, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
                    >
                      {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
                    </button>
                    <div style={{ height: '1px', background: theme.borderLight, margin: '4px 2px' }} />
                    {categoryLabels.map(label => {
                      const isActive = label === currentTab
                      const img = categoryImages[label]
                      return (
                        <button
                          key={label}
                          onClick={() => { setActiveTab(label); setSearch(''); setBurgerOpen(false) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: isActive ? `${theme.primary}1A` : 'transparent',
                            border: 'none', borderRadius: '8px', padding: '8px 10px',
                            color: isActive ? theme.primary : theme.textPrimary,
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: isActive ? '700' : '500', textAlign: 'left'
                          }}
                        >
                          <span style={{
                            width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem',
                            background: img ? 'transparent' : theme.pageBackground
                          }}>
                            {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : categorized[label].emoji}
                          </span>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ONGLETS CATÉGORIES — horizontaux scrollables, masqués sous 429px (déplacés dans le burger) */}
        <div
          className="menu-desktop-controls category-tabs-scroll"
          style={{
            display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '16px',
            paddingBottom: '2px', maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto'
          }}
        >
          {categoryLabels.map(label => {
            const isActive = label === currentTab
            const img = categoryImages[label]
            return (
              <button
                key={label}
                onClick={() => { setActiveTab(label); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.16)',
                  color: isActive ? (restaurant.primary_color || theme.primary) : '#fff',
                  border: 'none', borderRadius: '999px', padding: '7px 14px 7px 7px',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                }}
              >
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: img ? 'transparent' : 'rgba(0,0,0,0.08)', fontSize: '0.85rem'
                }}>
                  {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : categorized[label].emoji}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* RECHERCHE — sortie du header, propre icône lucide */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: theme.cardBackground, borderRadius: '12px', padding: '10px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <SearchIcon size={18} color={theme.textSecondary} strokeWidth={2} />
          <input
            type="text" placeholder="Rechercher un plat..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: theme.textPrimary }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary, display: 'flex', alignItems: 'center' }}>
              <XIcon size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px' }}>

        {/*
          Grille produits responsive "anti-abdos" :
          auto-fill + minmax évite le mur de cases carrées identiques sur grand écran —
          2 colonnes sur mobile, jusqu'à 5-6 sur desktop selon la largeur, sans jamais
          devenir minuscule.
        */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: theme.textSecondary }}>
            <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>🍽</p>
            <p style={{ fontFamily: 'Georgia, serif' }}>Aucun plat trouvé</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '16px'
          }}>
            {filteredItems.map(item => {
              const qty = selection[item.id]?.qty || 0
              return (
                <div key={item.id} onClick={() => setDetailItem(item)} style={{
                  background: theme.cardBackground, borderRadius: '16px',
                  boxShadow: qty > 0 ? `0 4px 16px ${theme.primary}33` : '0 2px 8px rgba(0,0,0,0.08)',
                  border: qty > 0 ? `2px solid ${theme.primary}` : '2px solid transparent',
                  overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column'
                }}>
                  {/* Image pleine largeur en haut — ratio 4:3 fixe, cohérent avec les cards catégories */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', overflow: 'hidden' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem' }}>{getEmoji(item)}</span>
                    }
                    {qty > 0 && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: theme.primary, color: '#fff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                        {qty}
                      </div>
                    )}
                    {/* Prix — badge flottant, bien visible sur la photo */}
                    <div style={{
                      position: 'absolute', bottom: '8px', left: '8px',
                      background: 'rgba(255,255,255,0.95)', color: '#C9A84C',
                      fontWeight: 'bold', fontSize: '0.78rem', padding: '4px 10px', borderRadius: '999px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      {item.price.toLocaleString()} FCFA
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px 12px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem', fontFamily: 'Georgia, serif', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: theme.textSecondary }}>
                      ⏱ ~{item.estimated_minutes} min
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* BARRE COMMANDER */}
      {selectedItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.primary, padding: '14px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>{totalQty} article(s) · ~{maxMinutes} min</p>
              <p style={{ margin: '2px 0 0', color: '#C9A84C', fontWeight: 'bold', fontSize: '1.1rem' }}>{total.toLocaleString()} FCFA</p>
            </div>
            <button onClick={() => setShowCartReview(true)} style={{ background: '#C9A84C', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '25px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
              Voir ma commande →
            </button>
          </div>
        </div>
      )}

      {/* MODALE DÉTAIL PLAT */}
      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDetailItem(null)}>
          <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '0 0 28px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', borderRadius: '20px 20px 0 0', position: 'relative', overflow: 'hidden' }}>
              {detailItem.image_url
                ? <img src={detailItem.image_url} alt={detailItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{getEmoji(detailItem)}</span>
              }
            </div>
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.2rem', flex: 1 }}>
                  {detailItem.name}
                </h2>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '1.1rem', marginLeft: '12px' }}>
                  {detailItem.price.toLocaleString()} FCFA
                </p>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: theme.textSecondary }}>
                ⏱ ~{detailItem.estimated_minutes} min de préparation
              </p>
              {detailItem.description ? (
                <p style={{ margin: '12px 0 0', fontSize: '0.85rem', color: theme.textSecondary, lineHeight: 1.6, background: theme.cardBackground, borderRadius: '10px', padding: '12px' }}>
                  {detailItem.description}
                </p>
              ) : (
                <p style={{ margin: '12px 0 0', fontSize: '0.82rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                  Aucune description disponible
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setDetailItem(null)} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '12px', padding: '12px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
                  Fermer
                </button>
                {selection[detailItem.id]?.qty > 0 ? (
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => removeItem(detailItem.id)} style={{ flex: 1, height: '44px', borderRadius: '10px', background: theme.pageBackground, border: 'none', color: theme.textPrimary, fontSize: '1.2rem', cursor: 'pointer' }}>−</button>
                    <span style={{ fontWeight: 'bold', color: theme.primary, minWidth: '20px', textAlign: 'center' }}>{selection[detailItem.id].qty}</span>
                    <button onClick={() => addItem(detailItem)} style={{ flex: 1, height: '44px', borderRadius: '10px', background: theme.primary, border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => { addItem(detailItem); setDetailItem(null) }} style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Ajouter au panier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CartReviewModal
        theme={theme} show={showCartReview} onClose={() => setShowCartReview(false)}
        selectedItems={selectedItems} addItem={addItem} removeItem={removeItem}
        deleteItemFromCart={deleteItemFromCart} total={total} totalQty={totalQty} maxMinutes={maxMinutes}
        onConfirm={() => { setShowCartReview(false); setShowModal(true) }}
      />

      <OrderModal
        showModal={showModal} setShowModal={setShowModal}
        orderType={orderType} setOrderType={setOrderType}
        tableNumber={tableNumber} setTableNumber={setTableNumber}
        customerName={customerName} setCustomerName={setCustomerName}
        submitting={submitting} submitOrder={submitOrder}
        theme={theme}
      />
    </div>
  )
}