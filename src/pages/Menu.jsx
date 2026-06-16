import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

// Modale réutilisable
function OrderModal({ showModal, setShowModal, orderType, setOrderType, tableNumber, setTableNumber, customerName, setCustomerName, submitting, submitOrder }) {
  if (!showModal) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50
    }}>
      <div style={{ background: '#FFF8F0', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '28px 24px' }}>
        <div style={{ width: '40px', height: '3px', background: '#ddd', borderRadius: '2px', margin: '0 auto 20px' }} />
        <h2 style={{ margin: '0 0 6px', fontFamily: 'Georgia, serif', color: '#8B0000', fontSize: '1.2rem' }}>
          Type de commande
        </h2>
        <p style={{ margin: '0 0 20px', color: '#999', fontSize: '0.8rem' }}>
          Comment souhaitez-vous recevoir votre commande ?
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { value: 'sur_place', label: 'Sur place', emoji: '🪑', desc: 'Numéro de table' },
            { value: 'emporter', label: 'À emporter', emoji: '🥡', desc: 'Votre nom' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setOrderType(opt.value)}
              style={{
                flex: 1, padding: '16px 12px', borderRadius: '14px', cursor: 'pointer',
                border: `2px solid ${orderType === opt.value ? '#8B0000' : '#e8ddd4'}`,
                background: orderType === opt.value ? '#FFF0F0' : '#fff',
                textAlign: 'center', transition: 'all 0.2s'
              }}
            >
              <p style={{ fontSize: '1.8rem', margin: '0 0 6px' }}>{opt.emoji}</p>
              <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '0.85rem' }}>{opt.label}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#999' }}>{opt.desc}</p>
            </button>
          ))}
        </div>
        {orderType === 'sur_place' ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
              Numéro de table
            </label>
            <input
              type="number"
              placeholder="Ex: 4"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              style={{
                width: '100%', border: '2px solid #8B0000', borderRadius: '12px',
                padding: '14px', fontSize: '1.5rem', textAlign: 'center',
                background: '#fff', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
              Votre nom
            </label>
            <input
              type="text"
              placeholder="Ex: Jean"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{
                width: '100%', border: '2px solid #8B0000', borderRadius: '12px',
                padding: '14px', fontSize: '1.2rem', textAlign: 'center',
                background: '#fff', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowModal(false)} style={{
            flex: 1, border: '2px solid #ddd', background: 'transparent',
            borderRadius: '12px', padding: '14px', color: '#666', fontWeight: '600', cursor: 'pointer'
          }}>
            Annuler
          </button>
          <button
            onClick={submitOrder}
            disabled={orderType === 'sur_place' ? !tableNumber || submitting : !customerName || submitting}
            style={{
              flex: 2, background: '#8B0000', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '14px', fontWeight: 'bold',
              cursor: 'pointer',
              opacity: (orderType === 'sur_place' ? !tableNumber : !customerName) || submitting ? 0.5 : 1
            }}
          >
            {submitting ? 'Envoi...' : 'Confirmer la commande'}
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
  const [showModal, setShowModal] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState('sur_place')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchMenu() {
      const { data: resto } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()

      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('available', true)

      setRestaurant(resto)
      setItems(menuItems || [])
      setLoading(false)
    }
    fetchMenu()
  }, [restaurantId])

  function addItem(item) {
    setSelection(prev => ({
      ...prev,
      [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 }
    }))
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

  async function submitOrder() {
    if (orderType === 'sur_place' && !tableNumber) return
    if (orderType === 'emporter' && !customerName) return
    setSubmitting(true)

    const selectedItems = Object.values(selection)
    const maxMinutes = Math.max(...selectedItems.map(i => i.estimated_minutes))
    const estimatedReadyAt = new Date(Date.now() + maxMinutes * 60 * 1000)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_number: orderType === 'sur_place' ? parseInt(tableNumber) : null,
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

    navigate(`/tracking/${data.id}`)
  }

  const selectedItems = Object.values(selection)
  const total = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0)
  const maxMinutes = selectedItems.length ? Math.max(...selectedItems.map(i => i.estimated_minutes)) : 0
  const categorized = categorize(items)

  if (loading) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif' }}>Chargement du menu...</p>
    </div>
  )

  if (!restaurant) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000' }}>Restaurant introuvable.</p>
    </div>
  )

  // PAGE CATÉGORIE
  if (category) {
    const decoded = decodeURIComponent(category)
    const catData = categorized[decoded]
    const catItems = catData?.items || []
    const filteredItems = search.trim()
      ? catItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : catItems

    return (
      <div style={{ background: '#FFF8F0', minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '100px' : '40px' }}>

        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
          padding: '28px 20px 24px'
        }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate(`/menu/${restaurantId}`)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Retour
            </button>
            <div>
              <p style={{ color: '#C9A84C', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                {restaurant.name}
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.3rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                {catData?.emoji} {decoded}
              </h1>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>

          {/* RECHERCHE */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#fff', borderRadius: '12px', padding: '10px 16px',
            boxShadow: '0 2px 8px rgba(139,0,0,0.08)',
            border: '1px solid rgba(139,0,0,0.1)', marginBottom: '16px'
          }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: '#1a1a1a' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>✕</button>}
          </div>

          {/* ITEMS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map(item => {
              const qty = selection[item.id]?.qty || 0
              return (
                <div key={item.id} style={{
                  background: '#fff', borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(139,0,0,0.08)',
                  borderLeft: qty > 0 ? '3px solid #8B0000' : '3px solid transparent'
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: qty > 0 ? 'bold' : '500', color: '#1a1a1a', fontSize: '0.9rem' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#999' }}>~{item.estimated_minutes} min</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {item.price.toLocaleString()} <span style={{ fontSize: '0.7rem' }}>FCFA</span>
                    </p>
                    {qty === 0 ? (
                      <button onClick={() => addItem(item)} style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: '#8B0000', color: '#fff', border: 'none',
                        fontSize: '1.2rem', cursor: 'pointer'
                      }}>+</button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => removeItem(item.id)} style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: '#f0f0f0', color: '#333', border: 'none', cursor: 'pointer'
                        }}>−</button>
                        <span style={{ fontWeight: 'bold', minWidth: '16px', textAlign: 'center', color: '#8B0000' }}>{qty}</span>
                        <button onClick={() => addItem(item)} style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: '#8B0000', color: '#fff', border: 'none', cursor: 'pointer'
                        }}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BARRE COMMANDER */}
        {selectedItems.length > 0 && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#8B0000', padding: '14px 20px',
            boxShadow: '0 -4px 20px rgba(139,0,0,0.3)'
          }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                  {totalQty} article(s) · ~{maxMinutes} min
                </p>
                <p style={{ margin: '2px 0 0', color: '#C9A84C', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {total.toLocaleString()} FCFA
                </p>
              </div>
              <button onClick={() => setShowModal(true)} style={{
                background: '#C9A84C', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: '25px',
                fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
              }}>
                Commander →
              </button>
            </div>
          </div>
        )}

        <OrderModal
          showModal={showModal} setShowModal={setShowModal}
          orderType={orderType} setOrderType={setOrderType}
          tableNumber={tableNumber} setTableNumber={setTableNumber}
          customerName={customerName} setCustomerName={setCustomerName}
          submitting={submitting} submitOrder={submitOrder}
        />
      </div>
    )
  }

  // PAGE ACCUEIL — GRILLE CATÉGORIES
  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '100px' : '40px' }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
        padding: '32px 20px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }} />
        <p style={{ color: '#C9A84C', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>
          Pâtisserie · Snack · Restaurant
        </p>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontFamily: 'Georgia, serif', margin: '0 0 4px' }}>
          Le Bourgeois
        </h1>
        <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '10px auto 8px' }} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontFamily: 'Georgia, serif' }}>
          Marché Moungali · Brazzaville
        </p>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
          Choisissez une catégorie
        </p>

        {/* GRILLE CATÉGORIES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(categorized).map(([label, data]) => (
            <button
              key={label}
              onClick={() => navigate(`/menu/${restaurantId}/${encodeURIComponent(label)}`)}
              style={{
                background: '#fff', border: 'none', borderRadius: '16px',
                padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(139,0,0,0.08)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                borderBottom: '3px solid #8B0000'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>{data.emoji}</p>
              <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#999' }}>
                {data.items.length} article(s)
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* BARRE COMMANDER */}
      {selectedItems.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#8B0000', padding: '14px 20px',
          boxShadow: '0 -4px 20px rgba(139,0,0,0.3)'
        }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                {totalQty} article(s) · ~{maxMinutes} min
              </p>
              <p style={{ margin: '2px 0 0', color: '#C9A84C', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {total.toLocaleString()} FCFA
              </p>
            </div>
            <button onClick={() => setShowModal(true)} style={{
              background: '#C9A84C', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: '25px',
              fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
            }}>
              Commander →
            </button>
          </div>
        </div>
      )}

      <OrderModal
        showModal={showModal} setShowModal={setShowModal}
        orderType={orderType} setOrderType={setOrderType}
        tableNumber={tableNumber} setTableNumber={setTableNumber}
        customerName={customerName} setCustomerName={setCustomerName}
        submitting={submitting} submitOrder={submitOrder}
      />
    </div>
  )
}