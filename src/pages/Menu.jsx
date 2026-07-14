import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'


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

// ─── MODALE REVIEW PANIER — voir/modifier/supprimer avant de commander ───
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

  // ── THÈME — appelé inconditionnellement, avant tout return ──
  const { theme, darkMode, toggleDarkMode } = useTheme(restaurant?.primary_color)

  useEffect(() => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let isMounted = true;

    async function fetchMenu() {
      setLoading(true);

      if (!UUID_REGEX.test(restaurantId)) {
        if (isMounted) {
          setRestaurant(null);
          setItems([]);
          setLoading(false);
        }
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

        if (!isMounted) return;

        setRestaurant(resto || null);
        setItems(menuItems || []);

      } catch (error) {
        console.error(error);
        if (isMounted) {
          setRestaurant(null);
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Sauvegarder à chaque changement de sélection
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
      return {
        ...prev,
        [item.id]: { ...item, qty: currentQty + 1 }
      }
    })
  }

  function removeItem(itemId) {
    setSelection(prev => {
      const qty = (prev[itemId]?.qty || 0) - 1
      if (qty <= 0) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: { ...prev[itemId], qty } }
    })
  }

  function deleteItemFromCart(itemId) {
    setSelection(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  function validateTableNumber(value) {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1 || num > 999) return null
    return num
  }

  async function submitOrder() {
    if (submitting) return
    const validTable = validateTableNumber(tableNumber)
    if (orderType === 'sur_place' && !validTable) {
      alert('Numéro de table invalide')
      return
    }
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
      .select()
      .single()

    if (error) {
      alert('Erreur lors de la commande. Réessaie.')
      setSubmitting(false)
      return
    }

    localStorage.removeItem(`selection_${restaurantId}`)
    navigate(`/tracking/${data.id}`)
  }

  const selectedItems = Object.values(selection)
  const total = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0)
  const maxMinutes = selectedItems.length ? Math.max(...selectedItems.map(i => i.estimated_minutes)) : 0
  const categorized = categorize(items)

  if (loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.primary, fontFamily: 'Georgia, serif' }}>Chargement du menu...</p>
    </div>
  )

  if (!restaurant) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.primary }}>Restaurant introuvable.</p>
    </div>
  )

 

  // ─── PAGE CATÉGORIE ───
  if (category) {
    const decoded = decodeURIComponent(category)
    const catData = categorized[decoded]
    const catItems = catData?.items || []
    const filteredItems = search.trim()
      ? catItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : catItems

    return (
      <div style={{ background: theme.pageBackground, minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '100px' : '40px' }}>

        {/* HEADER CATÉGORIE — FIXED */}
        <div
          style={{
            background: `linear-gradient(135deg, ${restaurant.primary_color || theme.primary}, ${restaurant.primary_color || theme.primary}CC)`,
            padding: '16px 20px 20px',
            position: 'sticky', top: 0, zIndex: 40,
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>

            {/* LIGNE 1 — retour + burger */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button onClick={() => navigate(`/menu/${restaurantId}`)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>
                ← Retour
              </button>
              <button onClick={toggleDarkMode} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '0.9rem' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            </div>

            {/* LIGNE 2 — logo + identité + catégorie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt="logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${restaurant.secondary_color || theme.borderLight}`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: restaurant.secondary_color || '#C9A84C', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {restaurant.slogan || restaurant.name}
                </p>
                <h1 style={{ color: '#fff', fontSize: '1.1rem', fontFamily: 'Georgia, serif', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {catData?.emoji} {decoded}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>

         

          {/* GRILLE CARRÉE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filteredItems.map(item => {
              const qty = selection[item.id]?.qty || 0
              return (
                <div key={item.id} onClick={() => setDetailItem(item)} style={{
                  background: theme.cardBackground, borderRadius: '16px',
                  boxShadow: qty > 0 ? `0 4px 16px ${theme.primary}33` : '0 2px 8px rgba(0,0,0,0.08)',
                  border: qty > 0 ? `2px solid ${theme.primary}` : '2px solid transparent',
                  overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease'
                }}>
                  <div style={{ background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', position: 'relative' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      : <span>{getEmoji(item)}</span>
                    }
                    {qty > 0 && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: theme.primary, color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {qty}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.82rem', fontFamily: 'Georgia, serif', lineHeight: 1.3 }}>
                      {item.name}
                    </p>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '0.8rem' }}>
                      {item.price.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BARRE COMMANDER — ouvre maintenant la review panier */}
        {selectedItems.length > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.primary, padding: '14px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <div style={{ background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', borderRadius: '20px 20px 0 0', position: 'relative', overflow: 'hidden' }}>
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
          theme={theme}
          show={showCartReview}
          onClose={() => setShowCartReview(false)}
          selectedItems={selectedItems}
          addItem={addItem}
          removeItem={removeItem}
          deleteItemFromCart={deleteItemFromCart}
          total={total}
          totalQty={totalQty}
          maxMinutes={maxMinutes}
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

  // ─── PAGE ACCUEIL — GRILLE CATÉGORIES ───
  return (
    <div style={{
      background: theme.pageBackground,
      minHeight: '100vh',
      paddingBottom: selectedItems.length > 0 ? '100px' : '40px'
    }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${restaurant.primary_color || theme.primary}CC, ${restaurant.primary_color || theme.primary})`,
        padding: '16px 20px 20px',
        position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* LIGNE 1 — logo + burger */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="logo" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${restaurant.secondary_color || theme.borderLight}` }} />
            ) : <div />}
            <button onClick={toggleDarkMode} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '0.9rem' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* LIGNE 2 — identité */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: restaurant.secondary_color || '#C9A84C', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
              {restaurant.slogan || restaurant.name}
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', margin: 0 }}>
              Découvrez Notre Menu
            </h1>
          </div>
        </div>
      </div>
            
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
        {/* RECHERCHE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: theme.cardBackground, borderRadius: '12px', padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: `1px solid ${theme.textSecondary}`, marginBottom: '16px' }}>
            <span>🔍</span>
            <input type="text" placeholder="Rechercher..."  value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: theme.textMuted }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary }}>✕</button>}
          </div>
        <p style={{ color: theme.textPrimary, fontFamily: 'Georgia, serif', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
          Choisissez une catégorie
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(categorized).map(([label, data]) => (
            <button key={label} onClick={() => navigate(`/menu/${restaurantId}/${encodeURIComponent(label)}`)}
              style={{ background: theme.cardBackground, border: 'none', borderRadius: '16px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.15s ease, box-shadow 0.15s ease', borderBottom: `3px solid ${theme.primary}` }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>{data.emoji}</p>
              <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>{label}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: theme.textSecondary }}>{data.items.length} article(s)</p>
            </button>
          ))}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.primary, padding: '14px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <CartReviewModal
        theme={theme}
        show={showCartReview}
        onClose={() => setShowCartReview(false)}
        selectedItems={selectedItems}
        addItem={addItem}
        removeItem={removeItem}
        deleteItemFromCart={deleteItemFromCart}
        total={total}
        totalQty={totalQty}
        maxMinutes={maxMinutes}
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