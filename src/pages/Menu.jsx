import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import {
  Search as SearchIcon, X as XIcon, Menu as BurgerIcon,
  Sun, Moon, Trash2, Clock, UtensilsCrossed, Table2, ShoppingBag,
  Croissant, Cake, CookingPot, Sandwich, Egg, Drumstick, Beef, Fish,
  Pizza as PizzaIcon, Salad, Coffee, CupSoda, IceCream2, Utensils,
} from 'lucide-react'

const CATEGORIES = [
  { label: 'Croissanterie', icon: Croissant, keywords: ['croissant', 'donuts', 'madeleine', 'pain', 'pudding', 'chausson', 'flan', 'brioche', 'palmier', 'sable', 'allumette', 'jesuite', 'cornet', 'paille', 'andalou', 'feuillette', 'jalousie', 'pic'] },
  { label: 'Gâteaux', icon: Cake, keywords: ['moka', 'lunette', 'boutonnier', 'cake', 'tarte', 'maria'] },
  { label: 'Crêpes', icon: CookingPot, keywords: ['crêpe', 'crepe'] },
  { label: 'Hamburgers', icon: Sandwich, keywords: ['hamburger', 'big burger', 'assiette hb'] },
  { label: 'Sandwichs', icon: Sandwich, keywords: ['sandwich', 'chawarma', 'bog dog'] },
  { label: 'Petit Déjeuner', icon: Egg, keywords: ['œuf', 'omelette'] },
  { label: 'Volailles', icon: Drumstick, keywords: ['poulet', 'yassa', 'demi-poulet'] },
  { label: 'Viandes', icon: Beef, keywords: ['steak', 'brochette de bœuf', 'saucisse'] },
  { label: 'KFC', icon: Drumstick, keywords: ['ailes', 'trio', 'ailerons'] },
  { label: 'Poissons', icon: Fish, keywords: ['poisson', 'carpe', 'bar', 'likouf', 'sole', 'fillet'] },
  { label: 'Pizza', icon: PizzaIcon, keywords: ['pizza'] },
  { label: 'Salades', icon: Salad, keywords: ['salade', 'verte', 'choux', 'mixte', 'avocat', 'nicoise', 'niçoise', 'tomate', 'pomme de terre'] },
  { label: 'Accompagnements', icon: UtensilsCrossed, keywords: ['riz', 'banane', 'frites'] },
  { label: 'Thé & Café', icon: Coffee, keywords: ['lait', 'chocolat', 'thé', 'café', 'nescafé', 'expresso'] },
  { label: 'Boissons', icon: CupSoda, keywords: ['orangina', 'yaourt', 'fresco', 'eau', 'coca', 'sprite', 'fanta', 'pulp', 'grenadine', 'reactor', 'tonic', 'jus', 'red bull', 'bavard'] },
  { label: 'Glaces', icon: IceCream2, keywords: ['glace'] },
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
      result[cat.label] = { icon: cat.icon, items: matched }
    }
  })
  const uncategorized = items.filter(i => !used.has(i.id))
  if (uncategorized.length > 0) result['Autres'] = { icon: Utensils, items: uncategorized }
  return result
}

function getIcon(item) {
  return CATEGORIES.find(c => c.keywords.some(k => item.name.toLowerCase().includes(k)))?.icon || Utensils
}

// ─── MODALE TYPE DE COMMANDE ───
function OrderModal({ theme, showModal, setShowModal, orderType, setOrderType, tableNumber, setTableNumber, customerName, setCustomerName, submitting, submitOrder }) {
  if (!showModal) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '24px 24px 0 0', padding: '32px 28px' }}>
        <div style={{ width: '40px', height: '3px', background: theme.borderLight, borderRadius: '2px', margin: '0 auto 24px' }} />
        <h2 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.25rem', fontWeight: 'normal' }}>Type de commande</h2>
        <p style={{ margin: '0 0 24px', color: theme.textSecondary, fontSize: '0.82rem' }}>Comment souhaitez-vous recevoir votre commande ?</p>
        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
          {[
            { value: 'sur_place', label: 'Sur place', Icon: Table2, desc: 'Numéro de table' },
            { value: 'emporter', label: 'À emporter', Icon: ShoppingBag, desc: 'Votre nom' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setOrderType(opt.value)} style={{
              flex: 1, padding: '20px 14px', borderRadius: '16px', cursor: 'pointer',
              border: `2px solid ${orderType === opt.value ? theme.primary : theme.borderLight}`,
              background: orderType === opt.value ? `${theme.primary}1A` : theme.cardBackground,
              textAlign: 'center', transition: 'all 0.2s'
            }}>
              <opt.Icon size={26} color={orderType === opt.value ? theme.primary : theme.textSecondary} style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 3px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem' }}>{opt.label}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: theme.textSecondary }}>{opt.desc}</p>
            </button>
          ))}
        </div>
        {orderType === 'sur_place' ? (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: theme.primary, marginBottom: '8px', fontWeight: '600' }}>Numéro de table</label>
            <input type="number" placeholder="Ex: 4" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
              style={{ width: '100%', border: `2px solid ${theme.primary}`, borderRadius: '14px', padding: '16px', fontSize: '1.5rem', textAlign: 'center', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: theme.primary, marginBottom: '8px', fontWeight: '600' }}>Votre nom complet</label>
            <input
              type="text"
              placeholder="Ex: Jean"
              maxLength={40}
              value={customerName}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 40);
                setCustomerName(value);
              }}
              style={{ width: '100%', border: `2px solid ${theme.primary}`, borderRadius: '14px', padding: '16px', fontSize: '1.2rem', textAlign: 'center', background: theme.cardBackground, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '14px' }}>
          <button onClick={() => setShowModal(false)} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '14px', padding: '15px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={submitOrder} disabled={orderType === 'sur_place' ? !tableNumber || submitting : !customerName || submitting}
            style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', padding: '15px', fontWeight: 'bold', cursor: 'pointer', opacity: (orderType === 'sur_place' ? !tableNumber : !customerName) || submitting ? 0.5 : 1 }}>
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
      <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '24px 24px 0 0', padding: '32px 28px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: '40px', height: '3px', background: theme.borderLight, borderRadius: '2px', margin: '0 auto 24px' }} />
        <h2 style={{ margin: '0 0 6px', fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.25rem', fontWeight: 'normal' }}>
          Votre commande
        </h2>
        <p style={{ margin: '0 0 24px', color: theme.textSecondary, fontSize: '0.82rem' }}>
          Vérifiez avant de confirmer — vous pouvez ajuster les quantités
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {selectedItems.map(item => (
            <div key={item.id} style={{
              background: theme.cardBackground, borderRadius: '14px', padding: '16px 18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: theme.textSecondary }}>
                  {item.price.toLocaleString()} FCFA · {(item.price * item.qty).toLocaleString()} FCFA
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button onClick={() => removeItem(item.id)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: theme.pageBackground, border: `1px solid ${theme.borderLight}`, color: theme.textPrimary, fontSize: '1rem', cursor: 'pointer' }}>−</button>
                <span style={{ fontWeight: 'bold', color: theme.primary, minWidth: '18px', textAlign: 'center', fontSize: '0.88rem' }}>{item.qty}</span>
                <button onClick={() => addItem(item)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: theme.primary, border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>+</button>
                <button onClick={() => deleteItemFromCart(item.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '9px', padding: '7px 9px', color: '#dc2626', cursor: 'pointer', marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `2px solid ${theme.primary}`, paddingTop: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: theme.textSecondary, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {totalQty} article(s) <Clock size={12} /> ~{maxMinutes} min
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', color: theme.textPrimary, fontFamily: 'Georgia, serif' }}>Total</span>
            <span style={{ fontWeight: 'bold', color: theme.primary, fontSize: '1.2rem' }}>{total.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <button onClick={onClose} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '14px', padding: '15px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
            Continuer mes achats
          </button>
          <button onClick={onConfirm} disabled={selectedItems.length === 0} style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', padding: '15px', fontWeight: 'bold', cursor: 'pointer', opacity: selectedItems.length === 0 ? 0.5 : 1 }}>
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
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
        // Les 3 requêtes sont indépendantes : on les lance en parallèle
        const [restoRes, menuRes, catRes] = await Promise.all([
          supabase
            .from('restaurants')
            .select('name, primary_color, secondary_color, slogan, address, logo_url')
            .eq('id', restaurantId)
            .single(),
          supabase
            .from('menu_items')
            .select('id, name, price, image_url, estimated_minutes, description')
            .eq('restaurant_id', restaurantId)
            .eq('available', true),
          supabase
            .from('menu_categories')
            .select('label, image_url')
            .eq('restaurant_id', restaurantId),
        ]);
        if (restoRes.error) throw restoRes.error;
        if (menuRes.error) throw menuRes.error;
        if (catRes.error) console.error('Menu: erreur catégories', catRes.error);

        const resto = restoRes.data;
        const menuItems = menuRes.data;
        const catRows = catRes.data;

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

  // Debounce : on ne filtre que 250 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

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

    // ── Session de table (uniquement pour "sur place") ──
    // Récupère la session déjà ouverte pour cette table, ou en crée une.
    // Permet de regrouper plusieurs commandes successives sous un même
    // numéro de reçu (session_number), au lieu d'un reçu par commande.
    let sessionId = null
    if (orderType === 'sur_place') {
      const { data: existingSession } = await supabase
        .from('order_sessions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', validTable)
        .eq('status', 'open')
        .maybeSingle()

      if (existingSession) {
        sessionId = existingSession.id
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('order_sessions')
          .insert({ restaurant_id: restaurantId, table_number: validTable })
          .select('id')
          .single()

        if (sessionError) { alert('Erreur lors de la commande. Réessaie.'); setSubmitting(false); return }
        sessionId = newSession.id
      }
    }

    const selectedItems = Object.values(selection)
    const maxMinutes = Math.max(...selectedItems.map(i => i.estimated_minutes))
    const estimatedReadyAt = new Date(Date.now() + maxMinutes * 60 * 1000)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_number: orderType === 'sur_place' ? validTable : null,
        session_id: sessionId,
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
  const categorized = useMemo(() => categorize(items), [items])
  const categoryLabels = Object.keys(categorized)

  // Onglet actif par défaut = premier disponible (ou celui de l'URL s'il existe encore)
  const currentTab = (activeTab && categorized[activeTab]) ? activeTab : categoryLabels[0]
  const catData = categorized[currentTab]
  const catItems = catData?.items || []
  const filteredItems = debouncedSearch.trim()
    ? catItems.filter(i => i.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : catItems

  if (loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', padding: '16px' }} aria-busy="true" aria-label="Chargement du menu">
      <style>{`@keyframes sk{0%{opacity:.55}50%{opacity:1}100%{opacity:.55}}.sk{background:rgba(128,128,128,.22);border-radius:14px;animation:sk 1.2s ease-in-out infinite}`}</style>
      <div className="sk" style={{ height: 48, width: '60%', marginBottom: 16 }} />
      <div className="sk" style={{ height: 40, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="sk" style={{ aspectRatio: '4 / 3', marginBottom: 8 }} />
            <div className="sk" style={{ height: 14, width: '80%', marginBottom: 6 }} />
            <div className="sk" style={{ height: 14, width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  )

  if (!restaurant) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.textPrimary }}>Restaurant introuvable.</p>
    </div>
  )

  return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '110px' : '48px' }}>

      {/* Masque la scrollbar des onglets horizontaux + media queries responsive */}
      <style>{`
        .category-tabs-scroll::-webkit-scrollbar { display: none }
        .category-tabs-scroll { scrollbar-width: none; -ms-overflow-style: none }
        @media (max-width: 429px) {
          .menu-desktop-controls { display: none !important; }
          .menu-burger-btn { display: flex !important; }
        }
      `}</style>

      {/* HEADER — logo grand + nom du restaurant en avant, un peu plus d'air vertical */}
      <div style={{
        background: `linear-gradient(135deg, ${restaurant.primary_color || theme.primary}, ${restaurant.primary_color || theme.primary}CC)`,
        padding: '24px 20px 20px',
        position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="logo" style={{
                width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover',
                border: `3px solid ${restaurant.secondary_color || '#fff'}`, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }} />
            ) : <div style={{ width: '58px' }} />}

            <div style={{ flex: 1, minWidth: 0 }}>
              {restaurant.slogan && (
                <p style={{ color: restaurant.secondary_color || '#C9A84C', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 3px', fontFamily: 'Georgia, serif' }}>
                  {restaurant.slogan}
                </p>
              )}
              <h1 style={{ color: '#fff', fontSize: '1.55rem', fontFamily: 'Georgia, serif', margin: 0, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {restaurant.name}
              </h1>
            </div>

            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button className="menu-desktop-controls" onClick={toggleDarkMode} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}>
                {darkMode ? <Sun size={17} color="#fff" /> : <Moon size={17} color="#fff" />}
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
                    background: theme.cardBackground, borderRadius: '14px', boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '210px',
                    maxHeight: '70vh', overflowY: 'auto'
                  }}>
                    <button
                      onClick={() => { toggleDarkMode(); setBurgerOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', borderRadius: '9px', padding: '10px', color: theme.textPrimary, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
                    >
                      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                      {darkMode ? 'Mode clair' : 'Mode sombre'}
                    </button>
                    <div style={{ height: '1px', background: theme.borderLight, margin: '4px 2px' }} />
                    {categoryLabels.map(label => {
                      const isActive = label === currentTab
                      const img = categoryImages[label]
                      const CatIcon = categorized[label].icon
                      return (
                        <button
                          key={label}
                          onClick={() => { setActiveTab(label); setSearch(''); setBurgerOpen(false) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: isActive ? `${theme.primary}1A` : 'transparent',
                            border: 'none', borderRadius: '9px', padding: '9px 10px',
                            color: isActive ? theme.primary : theme.textPrimary,
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: isActive ? '700' : '500', textAlign: 'left'
                          }}
                        >
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: img ? 'transparent' : theme.pageBackground
                          }}>
                            {img ? <img src={img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CatIcon size={13} />}
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
            display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '18px',
            paddingBottom: '2px', maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto'
          }}
        >
          {categoryLabels.map(label => {
            const isActive = label === currentTab
            const img = categoryImages[label]
            const CatIcon = categorized[label].icon
            return (
              <button
                key={label}
                onClick={() => { setActiveTab(label); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0,
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.16)',
                  color: isActive ? (restaurant.primary_color || theme.primary) : '#fff',
                  border: 'none', borderRadius: '999px', padding: '8px 16px 8px 8px',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                }}
              >
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: img ? 'transparent' : 'rgba(0,0,0,0.08)'
                }}>
                  {img ? <img src={img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CatIcon size={13} />}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* RECHERCHE — séparée du header par de l'air, pas collée dessous */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: theme.cardBackground, borderRadius: '14px', padding: '12px 18px',
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

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px' }}>

        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 0', color: theme.textSecondary }}>
            <UtensilsCrossed size={38} style={{ marginBottom: '14px', opacity: 0.45 }} />
            <p style={{ fontFamily: 'Georgia, serif' }}>Aucun plat trouvé</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '20px'
          }}>
            {filteredItems.map(item => {
              const qty = selection[item.id]?.qty || 0
              const ItemIcon = getIcon(item)
              return (
                <div key={item.id} onClick={() => setDetailItem(item)} style={{
                  background: theme.cardBackground, borderRadius: '18px',
                  boxShadow: qty > 0 ? `0 4px 16px ${theme.primary}33` : '0 2px 8px rgba(0,0,0,0.08)',
                  border: qty > 0 ? `2px solid ${theme.primary}` : '2px solid transparent',
                  overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', overflow: 'hidden' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ItemIcon size={42} color="#C9A84C" strokeWidth={1.4} />
                        </span>
                    }
                    {qty > 0 && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: theme.primary, color: '#fff', borderRadius: '50%', width: '27px', height: '27px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                        {qty}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: '10px', left: '10px',
                      background: 'rgba(255,255,255,0.95)', color: '#C9A84C',
                      fontWeight: 'bold', fontSize: '0.78rem', padding: '5px 11px', borderRadius: '999px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      {item.price.toLocaleString()} FCFA
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px 14px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem', fontFamily: 'Georgia, serif', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> ~{item.estimated_minutes} min
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.primary, padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>{totalQty} article(s) · ~{maxMinutes} min</p>
              <p style={{ margin: '3px 0 0', color: '#C9A84C', fontWeight: 'bold', fontSize: '1.1rem' }}>{total.toLocaleString()} FCFA</p>
            </div>
            <button onClick={() => setShowCartReview(true)} style={{ background: '#C9A84C', color: '#fff', border: 'none', padding: '11px 26px', borderRadius: '25px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
              Voir ma commande →
            </button>
          </div>
        </div>
      )}

      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDetailItem(null)}>
          <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '24px 24px 0 0', padding: '0 0 32px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px 24px 0 0', position: 'relative', overflow: 'hidden' }}>
              {detailItem.image_url
                ? <img src={detailItem.image_url} alt={detailItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (() => { const DetailIcon = getIcon(detailItem); return <DetailIcon size={64} color="#C9A84C" strokeWidth={1.3} /> })()
              }
            </div>
            <div style={{ padding: '24px 28px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.2rem', fontWeight: 'normal', flex: 1 }}>
                  {detailItem.name}
                </h2>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '1.1rem', marginLeft: '12px' }}>
                  {detailItem.price.toLocaleString()} FCFA
                </p>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} /> ~{detailItem.estimated_minutes} min de préparation
              </p>
              {detailItem.description ? (
                <p style={{ margin: '16px 0 0', fontSize: '0.85rem', color: theme.textSecondary, lineHeight: 1.6, background: theme.cardBackground, borderRadius: '12px', padding: '16px' }}>
                  {detailItem.description}
                </p>
              ) : (
                <p style={{ margin: '16px 0 0', fontSize: '0.82rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                  Aucune description disponible
                </p>
              )}
              <div style={{ display: 'flex', gap: '14px', marginTop: '24px' }}>
                <button onClick={() => setDetailItem(null)} style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '14px', padding: '13px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}>
                  Fermer
                </button>
                {selection[detailItem.id]?.qty > 0 ? (
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => removeItem(detailItem.id)} style={{ flex: 1, height: '46px', borderRadius: '12px', background: theme.pageBackground, border: 'none', color: theme.textPrimary, fontSize: '1.2rem', cursor: 'pointer' }}>−</button>
                    <span style={{ fontWeight: 'bold', color: theme.primary, minWidth: '20px', textAlign: 'center' }}>{selection[detailItem.id].qty}</span>
                    <button onClick={() => addItem(detailItem)} style={{ flex: 1, height: '46px', borderRadius: '12px', background: theme.primary, border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => { addItem(detailItem); setDetailItem(null) }} style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', padding: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
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