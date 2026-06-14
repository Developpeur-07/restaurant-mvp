import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { label: 'Croissanterie', keywords: ['croissant', 'donuts', 'madeleine', 'pain', 'pudding', 'chausson', 'flan', 'brioche', 'palmier', 'sable', 'allumette', 'jesuite', 'cornet', 'paille', 'andalou', 'feuillette', 'jalousie', 'pic'] },
  { label: 'Gâteaux', keywords: ['moka', 'lunette', 'boutonnier', 'cake', 'tarte', 'maria'] },
  { label: 'Crêpes', keywords: ['crêpe', 'crepe'] },
  { label: 'Hamburgers', keywords: ['hamburger', 'big burger', 'assiette hb'] },
  { label: 'Sandwichs & Chawarma', keywords: ['sandwich', 'chawarma', 'bog dog'] },
  { label: 'Petit Déjeuner', keywords: ['œuf', 'omelette'] },
  { label: 'Volailles', keywords: ['poulet', 'volaille', 'yassa', 'demi-poulet'] },
  { label: 'Viandes', keywords: ['steak', 'brochette de bœuf', 'saucisse'] },
  { label: 'KFC', keywords: ['ailes', 'trio', 'ailerons'] },
  { label: 'Poissons', keywords: ['poisson', 'carpe', 'bar', 'likouf', 'sole', 'fillet'] },
  { label: 'Pizza', keywords: ['pizza'] },
  { label: 'Salades', keywords: ['salade', 'verte', 'choux', 'mixte', 'avocat', 'nicoise', 'niçoise', 'tomate', 'pomme de terre'] },
  { label: 'Accompagnements', keywords: ['riz', 'banane', 'frites'] },
  { label: 'Thé & Café', keywords: ['lait', 'chocolat', 'thé', 'café', 'nescafé', 'expresso'] },
  { label: 'Boissons', keywords: ['orangina', 'yaourt', 'fresco', 'eau', 'coca', 'sprite', 'fanta', 'pulp', 'grenadine', 'reactor', 'tonic', 'jus', 'red bull', 'bavard'] },
  { label: 'Glaces', keywords: ['glace'] },
]

function categorize(items) {
  const result = {}
  const used = new Set()

  CATEGORIES.forEach(cat => {
    const matched = items.filter(item => {
      if (used.has(item.id)) return false
      const name = item.name.toLowerCase()
      return cat.keywords.some(k => name.includes(k))
    })
    if (matched.length > 0) {
      matched.forEach(i => used.add(i.id))
      result[cat.label] = matched
    }
  })

  const uncategorized = items.filter(i => !used.has(i.id))
  if (uncategorized.length > 0) result['Autres'] = uncategorized

  return result
}

export default function Menu() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState({})
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    if (!tableNumber || isNaN(tableNumber)) return
    setSubmitting(true)

    const selectedItems = Object.values(selection)
    const maxMinutes = Math.max(...selectedItems.map(i => i.estimated_minutes))
    const estimatedReadyAt = new Date(Date.now() + maxMinutes * 60 * 1000)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_number: parseInt(tableNumber),
        items: selectedItems.map(i => ({
          id: i.id, name: i.name, price: i.price, qty: i.qty
        })),
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
  const maxMinutes = selectedItems.length
    ? Math.max(...selectedItems.map(i => i.estimated_minutes))
    : 0

 const filteredItems = search.trim()
  ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  : items

const categorized = categorize(filteredItems)

  if (loading) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '1.1rem' }}>Chargement du menu...</p>
    </div>
  )

  if (!restaurant) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000' }}>Restaurant introuvable.</p>
    </div>
  )

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', paddingBottom: selectedItems.length > 0 ? '100px' : '40px' }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
        padding: '32px 20px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)',
        }} />
        <p style={{ color: '#C9A84C', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>
          Pâtisserie · Snack · Restaurant
        </p>
        <h1 style={{ color: '#FFFFFF', fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 'bold', margin: '0 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          Le Bourgeois
        </h1>
        <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '10px auto 8px' }} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontFamily: 'Georgia, serif' }}>
          Marché Moungali · Brazzaville
        </p>
      </div>

        {/* BARRE DE RECHERCHE */}
<div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 16px 0' }}>
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#fff', borderRadius: '12px', padding: '10px 16px',
    boxShadow: '0 2px 8px rgba(139,0,0,0.08)',
    border: '1px solid rgba(139,0,0,0.1)'
  }}>
    <span style={{ 
      fontSize: '1px' ,
      width: '16px', height: '16px', display: 'inline-block',
       background: 'url(../../public/Icon/loupe.png) no-repeat center center', 
       backgroundSize: 'contain'
    }}><img src="/Icon/loupe.png" alt="Rechercher" /></span>
    <input
      type="text"
      placeholder="Rechercher un plat..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{
        flex: 1, border: 'none', outline: 'none',
        background: 'transparent', fontSize: '0.9rem',
        color: '#1a1a1a', fontFamily: 'Georgia, serif'
      }}
    />
    {search && (
      <button
        onClick={() => setSearch('')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1rem' }}
      >
        ✕
      </button>
    )}
  </div>
</div>

      {/* MENU PAR CATÉGORIE */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
        {Object.entries(categorized).map(([category, catItems]) => (
          <div key={category} style={{ marginTop: '28px' }}>

            {/* Titre catégorie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '4px', height: '20px', background: '#8B0000', borderRadius: '2px' }} />
              <h2 style={{ color: '#8B0000', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', margin: 0 }}>
                {category}
              </h2>
              <div style={{ flex: 1, height: '1px', background: 'rgba(139,0,0,0.15)' }} />
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {catItems.map(item => {
                const qty = selection[item.id]?.qty || 0
                return (
                  <div key={item.id} style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(139,0,0,0.08)',
                    borderLeft: qty > 0 ? '3px solid #8B0000' : '3px solid transparent',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: qty > 0 ? 'bold' : '500', color: '#1a1a1a', fontSize: '0.9rem' }}>
                        {item.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#999' }}>
                        ~{item.estimated_minutes} min
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#C9A84C', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {item.price.toLocaleString()} <span style={{ fontSize: '0.7rem' }}>FCFA</span>
                      </p>

                      {qty === 0 ? (
                        <button onClick={() => addItem(item)} style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: '#8B0000', color: '#fff', border: 'none',
                          fontSize: '1.2rem', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}>+</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => removeItem(item.id)} style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#f0f0f0', color: '#333', border: 'none',
                            fontSize: '1rem', cursor: 'pointer'
                          }}>−</button>
                          <span style={{ fontWeight: 'bold', minWidth: '16px', textAlign: 'center', color: '#8B0000' }}>{qty}</span>
                          <button onClick={() => addItem(item)} style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#8B0000', color: '#fff', border: 'none',
                            fontSize: '1rem', cursor: 'pointer'
                          }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* BARRE COMMANDER */}
      {selectedItems.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#8B0000',
          padding: '14px 20px',
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
              fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              Commander →
            </button>
          </div>
        </div>
      )}

      {/* MODALE TABLE */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{
            background: '#FFF8F0', width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0', padding: '28px 24px'
          }}>
            <div style={{ width: '40px', height: '3px', background: '#ddd', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h2 style={{ margin: '0 0 6px', fontFamily: 'Georgia, serif', color: '#8B0000', fontSize: '1.2rem' }}>
              Numéro de table
            </h2>
            <p style={{ margin: '0 0 16px', color: '#999', fontSize: '0.8rem' }}>
              Entrez le numéro indiqué sur votre table
            </p>
            <input
              type="number"
              placeholder="Ex: 4"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              style={{
                width: '100%', border: '2px solid #8B0000', borderRadius: '12px',
                padding: '14px', fontSize: '1.5rem', textAlign: 'center',
                background: '#fff', color: '#1a1a1a', outline: 'none',
                boxSizing: 'border-box', marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, border: '2px solid #ddd', background: 'transparent',
                borderRadius: '12px', padding: '14px', color: '#666',
                fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
              }}>
                Annuler
              </button>
              <button onClick={submitOrder} disabled={!tableNumber || submitting} style={{
                flex: 2, background: '#8B0000', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '14px', fontWeight: 'bold',
                cursor: 'pointer', fontSize: '0.9rem', opacity: (!tableNumber || submitting) ? 0.5 : 1
              }}>
                {submitting ? 'Envoi...' : 'Confirmer la commande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}