import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

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

export default function MenuManager() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', price: '', estimated_minutes: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: resto } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (!resto) return
      setRestaurantId(resto.id)

      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('name', { ascending: true })

      setItems(data || [])
      setLoading(false)
    }
    init()
  }, [])

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', price: '', estimated_minutes: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, price: item.price, estimated_minutes: item.estimated_minutes })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.estimated_minutes) {
      setMessage({ type: 'error', text: 'Tous les champs sont obligatoires' })
      return
    }
    setSaving(true)

    if (editItem) {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          name: form.name,
          price: parseInt(form.price),
          estimated_minutes: parseInt(form.estimated_minutes),
        })
        .eq('id', editItem.id)
        .select()
        .single()

      if (!error) {
        setItems(prev => prev.map(i => i.id === editItem.id ? data : i))
        setMessage({ type: 'success', text: 'Plat mis à jour ✓' })
      }
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          name: form.name,
          price: parseInt(form.price),
          estimated_minutes: parseInt(form.estimated_minutes),
          available: true
        })
        .select()
        .single()

      if (!error) {
        setItems(prev => [...prev, data])
        setMessage({ type: 'success', text: 'Plat ajouté ✓' })
      }
    }

    setSaving(false)
    setShowForm(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function toggleAvailable(item) {
    const { data } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
      .select()
      .single()

    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(itemId) {
    if (!window.confirm('Supprimer ce plat définitivement ?')) return
    await supabase.from('menu_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const categorized = categorize(items)

  if (loading) return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif' }}>Chargement...</p>
    </div>
  )

  // PAGE CATÉGORIE
  if (activeCategory) {
    const catData = categorized[activeCategory]
    const catItems = catData?.items || []
    const filtered = search.trim()
      ? catItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : catItems

    return (
      <div style={{ background: '#FFF8F0', minHeight: '100vh', paddingBottom: '40px' }}>

        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
          padding: '28px 20px 24px'
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => { setActiveCategory(null); setSearch('') }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ← Retour
              </button>
              <div>
                <p style={{ color: '#C9A84C', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                  Gestion menu
                </p>
                <h1 style={{ color: '#fff', fontSize: '1.3rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                  {catData?.emoji} {activeCategory}
                </h1>
              </div>
            </div>
            <button
              onClick={openAdd}
              style={{ background: '#C9A84C', border: 'none', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              + Ajouter
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>

          {/* MESSAGE */}
          {message && (
            <div style={{
              background: message.type === 'success' ? '#f0fff0' : '#fff0f0',
              border: `1px solid ${message.type === 'success' ? '#90EE90' : '#ffcccc'}`,
              borderRadius: '10px', padding: '12px 16px', marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: message.type === 'success' ? '#2d6b2d' : '#cc0000' }}>
                {message.text}
              </p>
            </div>
          )}

          {/* RECHERCHE */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#fff', borderRadius: '12px', padding: '10px 16px',
            boxShadow: '0 2px 8px rgba(139,0,0,0.08)', marginBottom: '16px'
          }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>✕</button>}
          </div>

          {/* LISTE PLATS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>🍽</p>
                <p style={{ fontFamily: 'Georgia, serif' }}>Aucun plat dans cette catégorie</p>
                <button
                  onClick={openAdd}
                  style={{ marginTop: '12px', background: '#8B0000', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + Ajouter un plat
                </button>
              </div>
            ) : (
              filtered.map(item => (
                <div key={item.id} style={{
                  background: '#fff', borderRadius: '12px', padding: '14px 16px',
                  boxShadow: '0 1px 4px rgba(139,0,0,0.06)',
                  borderLeft: `4px solid ${item.available ? '#8B0000' : '#e0e0e0'}`,
                  opacity: item.available ? 1 : 0.6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#1a1a1a', fontSize: '0.9rem' }}>
                        {item.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#999' }}>
                        {item.price.toLocaleString()} FCFA · ~{item.estimated_minutes} min
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => toggleAvailable(item)}
                        style={{
                          background: item.available ? '#DCFCE7' : '#F3F4F6',
                          color: item.available ? '#166534' : '#6B7280',
                          border: 'none', borderRadius: '20px', padding: '4px 10px',
                          fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        {item.available ? '✓ Dispo' : '✗ Indispo'}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        style={{ background: '#FFF8F0', border: '1px solid #e8ddd4', borderRadius: '8px', padding: '6px 10px', color: '#8B0000', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FORMULAIRE MODALE */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#FFF8F0', width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '28px 24px' }}>
              <div style={{ width: '40px', height: '3px', background: '#ddd', borderRadius: '2px', margin: '0 auto 20px' }} />
              <h2 style={{ margin: '0 0 20px', fontFamily: 'Georgia, serif', color: '#8B0000', fontSize: '1.2rem' }}>
                {editItem ? 'Modifier le plat' : `Ajouter dans ${activeCategory}`}
              </h2>
              {[
                { label: 'Nom du plat', key: 'name', type: 'text', placeholder: 'Ex: Croissant au beurre' },
                { label: 'Prix (FCFA)', key: 'price', type: 'number', placeholder: 'Ex: 500' },
                { label: 'Temps de préparation (min)', key: 'estimated_minutes', type: 'number', placeholder: 'Ex: 5' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', border: '2px solid #e8ddd4', borderRadius: '10px',
                      padding: '11px 14px', fontSize: '0.9rem', background: '#fff',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ flex: 1, border: '2px solid #ddd', background: 'transparent', borderRadius: '12px', padding: '13px', color: '#666', fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 2, background: '#8B0000', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Enregistrement...' : editItem ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // PAGE ACCUEIL — GRILLE CATÉGORIES
  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', paddingBottom: '40px' }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)',
        padding: '28px 20px 24px'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Retour
            </button>
            <div>
              <p style={{ color: '#C9A84C', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                Administration
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.4rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                Gestion du menu
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

        {/* MESSAGE */}
        {message && (
          <div style={{
            background: message.type === 'success' ? '#f0fff0' : '#fff0f0',
            border: `1px solid ${message.type === 'success' ? '#90EE90' : '#ffcccc'}`,
            borderRadius: '10px', padding: '12px 16px', marginBottom: '16px'
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: message.type === 'success' ? '#2d6b2d' : '#cc0000' }}>
              {message.text}
            </p>
          </div>
        )}

        {/* STATS */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total plats', value: items.length, color: '#8B0000' },
            { label: 'Disponibles', value: items.filter(i => i.available).length, color: '#166534' },
            { label: 'Indisponibles', value: items.filter(i => !i.available).length, color: '#6B7280' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(139,0,0,0.06)' }}>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: stat.color, fontFamily: 'Georgia, serif' }}>{stat.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#999' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <p style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
          Sélectionnez une catégorie à gérer
        </p>

        {/* GRILLE CATÉGORIES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(categorized).map(([label, data]) => (
            <button
              key={label}
              onClick={() => setActiveCategory(label)}
              style={{
                background: '#fff', border: 'none', borderRadius: '16px',
                padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(139,0,0,0.08)',
                borderBottom: '3px solid #8B0000',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>{data.emoji}</p>
              <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: '#1a1a1a', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                {label}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '10px' }}>
                  {data.items.filter(i => i.available).length} dispo
                </span>
                {data.items.filter(i => !i.available).length > 0 && (
                  <span style={{ fontSize: '0.65rem', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '10px' }}>
                    {data.items.filter(i => !i.available).length} indispo
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}