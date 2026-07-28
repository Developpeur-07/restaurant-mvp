import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/useTheme'
import { useSubscription } from '../hooks/useSubscription'
import { Camera, Pencil, Loader2, Menu as BurgerIcon, Lock, Clipboard, Search, Trash2 } from 'lucide-react'

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

function slugify(label) {
  return label
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function MenuManager() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState(null)
  const [brand, setBrand] = useState({ name: '', primary_color: '#8B0000', secondary_color: '#C9A84C', logo_url: '' })
  const [activeCategory, setActiveCategory] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', estimated_minutes: '', description: '', image_url: '' })

  const [categoryImages, setCategoryImages] = useState({})
  const [uploadingCategory, setUploadingCategory] = useState(null)
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [burgerOpen, setBurgerOpen] = useState(false)

  const { theme, darkMode, toggleDarkMode } = useTheme(brand.primary_color)

  // ── ABONNEMENT — restaurantId résout owner OU reception (SubscriptionProvider) ──
  const { features, restaurantId: subRestaurantId, isOwner } = useSubscription()
  const atMenuLimit = items.length >= features.maxMenuItems

  useEffect(() => {
    async function init() {
      if (!subRestaurantId) return

      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', subRestaurantId)
        .single()

      if (!resto) { setLoading(false); return }

      setRestaurantId(resto.id)
      setBrand({
        name: resto.name || '',
        primary_color: resto.primary_color || '#8B0000',
        secondary_color: resto.secondary_color || '#C9A84C',
        logo_url: resto.logo_url || ''
      })

      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', resto.id)
        .order('name', { ascending: true })

      setItems(data || [])

      const { data: catRows } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', resto.id)

      const catMap = {}
        ; (catRows || []).forEach(row => {
          catMap[row.label] = { id: row.id, image_url: row.image_url }
        })
      setCategoryImages(catMap)

      setLoading(false)
    }
    init()
  }, [subRestaurantId])

  function openAdd() {
    if (!isOwner) return
    if (atMenuLimit) {
      setMessage({ type: 'error', text: `Limite de ${features.maxMenuItems} plats atteinte (mode gratuit) — réactivez l'abonnement pour un menu illimité` })
      setTimeout(() => setMessage(null), 4000)
      return
    }
    setEditItem(null)
    setForm({ name: '', price: '', estimated_minutes: '', description: '', image_url: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    if (!isOwner) return
    setEditItem(item)
    setForm({
      name: item.name,
      price: item.price,
      estimated_minutes: item.estimated_minutes,
      description: item.description || '',
      image_url: item.image_url || ''
    })
    setShowForm(true)
  }

  async function handleImageUpload(file, itemId) {
    if (!isOwner) return null
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Le fichier doit être une image' })
      return null
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop lourde (max 2 Mo)' })
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'Session expirée, reconnecte-toi' })
      return null
    }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${itemId || Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('menu-photos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (upErr) {
      setMessage({ type: 'error', text: 'Échec upload : ' + upErr.message })
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-photos')
      .getPublicUrl(path)

    return publicUrl
  }

  async function handleCategoryImageUpload(label, file) {
    if (!isOwner) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Le fichier doit être une image' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop lourde (max 2 Mo)' })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'Session expirée, reconnecte-toi' })
      return
    }

    setUploadingCategory(label)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${slugify(label)}-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('category-images')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (upErr) {
      setMessage({ type: 'error', text: 'Échec upload catégorie : ' + upErr.message })
      setUploadingCategory(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('category-images')
      .getPublicUrl(path)

    const { data, error } = await supabase
      .from('menu_categories')
      .upsert(
        { restaurant_id: restaurantId, label, image_url: publicUrl },
        { onConflict: 'restaurant_id,label' }
      )
      .select()
      .single()

    if (error) {
      setMessage({ type: 'error', text: 'Échec sauvegarde catégorie : ' + error.message })
      setUploadingCategory(null)
      return
    }

    setCategoryImages(prev => ({ ...prev, [label]: { id: data.id, image_url: data.image_url } }))
    setMessage({ type: 'success', text: `Image de "${label}" mise à jour ✓` })
    setUploadingCategory(null)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleSave() {
    if (!isOwner) return
    const cleanName = form.name.trim()
    const price = parseInt(form.price, 10)
    const minutes = parseInt(form.estimated_minutes, 10)

    if (!cleanName || cleanName.length > 60) {
      setMessage({ type: 'error', text: 'Nom invalide (1-60 caractères)' })
      return
    }
    if (isNaN(price) || price < 1 || price > 1000000) {
      setMessage({ type: 'error', text: 'Prix invalide (1 à 1 000 000 FCFA)' })
      return
    }
    if (isNaN(minutes) || minutes < 1 || minutes > 180) {
      setMessage({ type: 'error', text: 'Temps de préparation invalide (1-180 min)' })
      return
    }
    if (form.description && form.description.length > 300) {
      setMessage({ type: 'error', text: 'Description trop longue (max 300 caractères)' })
      return
    }

    setSaving(true)

    if (editItem) {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          name: cleanName,
          price,
          estimated_minutes: minutes,
          description: form.description || null,
          image_url: form.image_url || null,
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
          name: cleanName,
          price,
          estimated_minutes: minutes,
          description: form.description || null,
          image_url: form.image_url || null,
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
    if (!isOwner) return
    const { data } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
      .select()
      .single()

    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(itemId) {
    if (!isOwner) return
    if (!window.confirm('Supprimer ce plat définitivement ?')) return
    await supabase.from('menu_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const categorized = categorize(items)

  if (loading) return (
    <div style={{ background: theme.pageBackground, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: theme.textPrimary, fontFamily: 'Georgia, serif' }}>Chargement...</p>
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
      <div style={{ background: theme.pageBackground, minHeight: '100vh', paddingBottom: '40px' }}>
        <style>{`
          @media (max-width: 429px) {
            .mm-desktop-controls { display: none !important; }
            .mm-burger-btn { display: flex !important; }
          }
        `}</style>
        <div style={{
          background: `linear-gradient(135deg, ${brand.primary_color}CC, ${brand.primary_color})`,
          padding: '16px 20px 20px',
          position: 'sticky', top: 0, zIndex: 40,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                onClick={() => { setActiveCategory(null); setSearch(''); setBurgerOpen(false) }}
                style={{ display: 'flex', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
              >
                ← Retour
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <button className="mm-desktop-controls" onClick={toggleDarkMode} style={{ display: 'flex', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  {darkMode ? '☀️' : '🌙'}
                </button>
                {brand.logo_url && (
                  <img className="mm-desktop-controls" src={brand.logo_url} alt="logo" style={{ display: 'flex', width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand.secondary_color}` }} />
                )}
                {isOwner && (
                  <button
                    className="mm-desktop-controls"
                    onClick={openAdd}
                    disabled={atMenuLimit}
                    title={atMenuLimit ? `Limite de ${features.maxMenuItems} plats atteinte` : undefined}
                    style={{ background: brand.secondary_color, border: 'none', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontWeight: 'bold', cursor: atMenuLimit ? 'not-allowed' : 'pointer', fontSize: '0.82rem', opacity: atMenuLimit ? 0.5 : 1 }}
                  >
                    {atMenuLimit ? '🔒 Ajouter' : '+ Ajouter'}
                  </button>
                )}

                <button
                  className="mm-burger-btn"
                  onClick={() => setBurgerOpen(o => !o)}
                  style={{ display: 'none', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '7px 9px', color: '#fff', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
                >
                  <BurgerIcon size={18} />
                </button>

                {burgerOpen && (
                  <>
                    <div onClick={() => setBurgerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
                    <div style={{
                      position: 'absolute', top: '110%', right: 0, zIndex: 60,
                      background: theme.cardBackground, borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                      padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px'
                    }}>
                      {isOwner && (
                        <button
                          onClick={openAdd}
                          disabled={atMenuLimit}
                          title={atMenuLimit ? `Limite de ${features.maxMenuItems} plats atteinte` : undefined}
                          style={{ background: brand.secondary_color, border: 'none', borderRadius: '8px', padding: '7px 14px', color: '#fff', fontWeight: 'bold', cursor: atMenuLimit ? 'not-allowed' : 'pointer', fontSize: '0.82rem', opacity: atMenuLimit ? 0.5 : 1 }}
                        >
                          {atMenuLimit ? '🔒 Ajouter' : '+ Ajouter'}
                        </button>
                      )}

                      <button
                        onClick={() => { toggleDarkMode(); setBurgerOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 10px', color: theme.textPrimary, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
                      >
                        {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
                      </button>
                      {brand.logo_url && (
                        <Link
                          to={`/dashboard`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            borderRadius: "999px",
                            textDecoration: "none",
                            transition: "background .2s",
                          }}
                        >
                          <img
                            src={brand.logo_url}
                            alt={`${brand.name} logo`}
                            style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
                          />
                          <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: ".85rem" }}>
                            {brand.name}
                          </span>
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <p style={{ color: brand.secondary_color, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Georgia, serif' }}>
                Gestion menu · {brand.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {categoryImages[activeCategory]?.image_url ? (
                  <img
                    src={categoryImages[activeCategory].image_url}
                    alt={activeCategory}
                    style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${brand.secondary_color}`, flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: '1.1rem' }}>{catData?.emoji}</span>
                )}
                <h1 style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                  {activeCategory}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>

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

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: theme.cardBackground, borderRadius: '12px', padding: '10px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px'
          }}>
            <span><Search size={16} /></span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', color: theme.textPrimary }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSecondary }}>✕</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textSecondary }}>
                <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>🍽</p>
                <p style={{ fontFamily: 'Georgia, serif' }}>Aucun plat dans cette catégorie</p>
                {isOwner && (
                  <button
                    onClick={openAdd}
                    disabled={atMenuLimit}
                    title={atMenuLimit ? `Limite de ${features.maxMenuItems} plats atteinte` : undefined}
                    style={{ marginTop: '12px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 'bold', cursor: atMenuLimit ? 'not-allowed' : 'pointer', opacity: atMenuLimit ? 0.5 : 1 }}
                  >
                    {atMenuLimit ? `🔒 Limite de ${features.maxMenuItems} plats atteinte` : '+ Ajouter un plat'}
                  </button>
                )}
              </div>
            ) : (
              filtered.map(item => (
                <div key={item.id} style={{
                  background: theme.cardBackground, borderRadius: '12px', padding: '12px 16px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                  opacity: item.available ? 1 : 0.6,
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #FFF0E8, #FFE4D6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', overflow: 'hidden'
                  }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span>{getEmoji(item)}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: theme.textSecondary }}>
                      {item.price.toLocaleString()} FCFA · ~{item.estimated_minutes} min
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {isOwner && (
                      <>
                        <button
                          onClick={() => toggleAvailable(item)}
                          style={{
                            background: item.available ? '#DCFCE7' : '#F3F4F6',
                            color: item.available ? '#166534' : '#6B7280',
                            border: 'none', borderRadius: '20px', padding: '4px 10px',
                            fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          {item.available ? '✓' : '✗'}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          style={{
                            background: theme.pageBackground, border: `1px solid ${theme.borderLight}`,
                            borderRadius: "8px", padding: "6px 10px", color: theme.primary, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          style={{
                            background: "#fee2e2", border: "none", borderRadius: "8px", padding: "6px 10px",
                            color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showForm && isOwner && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, overflowY: 'auto' }}>
            <div style={{ background: theme.pageBackground, width: '100%', maxWidth: '480px', borderRadius: '20px 20px 0 0', padding: '28px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ width: '40px', height: '3px', background: theme.borderLight, borderRadius: '2px', margin: '0 auto 20px' }} />
              <h2 style={{ margin: '0 0 20px', fontFamily: 'Georgia, serif', color: theme.primary, fontSize: '1.2rem' }}>
                {editItem ? 'Modifier le plat' : `Ajouter dans ${activeCategory}`}
              </h2>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                  Image du plat (JPG, PNG, WebP · max 2MB)
                </label>
                {form.image_url && (
                  <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                    <img src={form.image_url} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: `2px solid ${theme.borderLight}` }} />
                    <button
                      onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                  </div>
                )}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: theme.cardBackground, border: `2px dashed ${theme.borderLight}`, borderRadius: '10px',
                  padding: '12px', cursor: 'pointer'
                }}>
                  <Camera size={20} color={theme.textSecondary} />
                  <span style={{ fontSize: '0.82rem', color: theme.textSecondary }}>
                    {uploadingImage ? 'Upload en cours...' : 'Choisir une image'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingImage(true)
                      const url = await handleImageUpload(file, editItem?.id)
                      if (url) setForm(prev => ({ ...prev, image_url: url }))
                      setUploadingImage(false)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {[
                { label: 'Nom du plat', key: 'name', type: 'text', placeholder: 'Ex: Croissant au beurre' },
                { label: 'Prix (FCFA)', key: 'price', type: 'number', placeholder: 'Ex: 500' },
                { label: 'Temps de préparation (min)', key: 'estimated_minutes', type: 'number', placeholder: 'Ex: 5' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '10px',
                      padding: '11px 14px', fontSize: '0.9rem', background: theme.cardBackground,
                      color: theme.textPrimary, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: theme.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                  Description / composition (allergies)
                </label>
                <textarea
                  maxLength={300}
                  placeholder="Ex: Pâte feuilletée, beurre, sucre. Contient gluten, lactose."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%', border: `2px solid ${theme.borderLight}`, borderRadius: '10px',
                    padding: '11px 14px', fontSize: '0.88rem', background: theme.cardBackground,
                    color: theme.textPrimary, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ flex: 1, border: `2px solid ${theme.borderLight}`, background: 'transparent', borderRadius: '12px', padding: '13px', color: theme.textSecondary, fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || uploadingImage}
                  style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: (saving || uploadingImage) ? 0.6 : 1 }}
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
    <div style={{ background: theme.pageBackground, minHeight: '100vh', paddingBottom: '40px' }}>
      <style>{`
        @media (max-width: 429px) {
          .mm-desktop-controls { display: none !important; }
          .mm-burger-btn { display: flex !important; }
        }
      `}</style>
      <div style={{
        background: `linear-gradient(135deg, ${brand.primary_color}CC, ${brand.primary_color})`,
        padding: '20px 20px', position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {brand.logo_url && (
              <img src={brand.logo_url} alt="logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand.secondary_color}` }} />
            )}
            <div>
              <p style={{ color: brand.secondary_color, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                Administration · {brand.name}
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                Gestion du menu
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <button
              className="mm-desktop-controls"
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Retour
            </button>
            <button className="mm-desktop-controls" onClick={toggleDarkMode} style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '8px 10px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>

            <button
              className="mm-burger-btn"
              onClick={() => setBurgerOpen(o => !o)}
              style={{ display: 'none', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 9px', color: '#fff', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
            >
              <BurgerIcon size={18} />
            </button>

            {burgerOpen && (
              <>
                <div onClick={() => setBurgerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 60,
                  background: theme.cardBackground, borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                  padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px'
                }}>
                  <button
                    onClick={() => { navigate('/dashboard'); setBurgerOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 10px', color: theme.textPrimary, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
                  >
                    ← Retour
                  </button>
                  <button
                    onClick={() => { toggleDarkMode(); setBurgerOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderRadius: '8px', padding: '9px 10px', color: theme.textPrimary, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
                  >
                    {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>

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

        {isFinite(features.maxMenuItems) && (
          <div
            style={{
              background: atMenuLimit ? "#FEF3C7" : theme.cardBackground,
              border: `1px solid ${atMenuLimit ? "#F59E0B" : theme.borderLight}`,
              borderRadius: "10px", padding: "10px 16px", marginBottom: "16px",
              fontSize: "0.8rem", color: atMenuLimit ? "#92400E" : theme.textSecondary,
              textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {atMenuLimit ? <Lock size={16} /> : <Clipboard size={16} />}
            <span>
              {items.length}/{features.maxMenuItems} plats (mode gratuit) — réactivez
              pour un menu illimité
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total plats', value: items.length, color: theme.textPrimary },
            { label: 'Disponibles', value: items.filter(i => i.available).length, color: 'green' },
            { label: 'Indisponibles', value: items.filter(i => !i.available).length, color: 'red' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, background: theme.cardBackground, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: stat.color, fontFamily: 'Georgia, serif' }}>{stat.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: theme.textSecondary }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <h2 style={{ color: theme.textPrimary, fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '16px', textAlign: 'center' }}>
          Sélectionnez une catégorie à gérer
        </h2>
        <p style={{ color: theme.textSecondary, fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center' }}>
          {isOwner ? "Ajoute une photo de présentation à chaque catégorie pour un rendu plus pro" : "Consultation seule — la gestion du menu est réservée au propriétaire"}
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '12px'
        }}>
          {Object.entries(categorized).map(([label, data]) => {
            const catImage = categoryImages[label]?.image_url
            const isUploadingThis = uploadingCategory === label
            const isHovered = hoveredCategory === label

            if (!catImage) {
              return (
                <div
                  key={label}
                  style={{
                    background: theme.cardBackground, borderRadius: '16px',
                    border: `2px dashed ${theme.borderLight}`,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column'
                  }}
                >
                  {isOwner ? (
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '5px', padding: '16px 10px 10px', cursor: isUploadingThis ? 'default' : 'pointer'
                    }}>
                      {isUploadingThis
                        ? <Loader2 size={26} color={theme.textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Camera size={26} color={theme.textSecondary} strokeWidth={1.75} />
                      }
                      <span style={{ fontSize: '0.72rem', color: theme.textSecondary, fontWeight: '600' }}>
                        {isUploadingThis ? 'Upload en cours...' : 'Ajouter une photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        disabled={isUploadingThis}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await handleCategoryImageUpload(label, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  ) : (
                    <div style={{ padding: '16px 10px 10px', display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.6rem' }}>{data.emoji}</span>
                    </div>
                  )}

                  <div style={{ padding: '0 10px 10px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                      {data.emoji} {label}
                    </p>
                    <button
                      onClick={() => setActiveCategory(label)}
                      style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      Voir les {data.items.length} plat(s) →
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <button
                key={label}
                onClick={() => setActiveCategory(label)}
                onMouseEnter={() => setHoveredCategory(label)}
                onMouseLeave={() => setHoveredCategory(null)}
                style={{
                  background: theme.cardBackground, border: 'none', borderRadius: '16px',
                  textAlign: 'center', cursor: 'pointer', overflow: 'hidden',
                  boxShadow: '0 5px 10px rgba(0,0,0,0.08)',
                  transition: 'transform 0.15s ease',
                  display: 'flex', flexDirection: 'column', padding: 0
                }}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden' }}>
                  <img src={catImage} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />

                  {isOwner && (
                    <label
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.55)', borderRadius: '50%',
                        width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isUploadingThis ? 'default' : 'pointer',
                        opacity: isHovered ? 1 : 0.75,
                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                        transition: 'opacity 0.15s ease, transform 0.15s ease'
                      }}
                    >
                      {isUploadingThis
                        ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                        : <Pencil size={13} color="#fff" strokeWidth={2} />
                      }
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        disabled={isUploadingThis}
                        onClick={e => e.stopPropagation()}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await handleCategoryImageUpload(label, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>

                <div style={{ padding: '9px 10px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                    {label}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '10px' }}>
                      {data.items.filter(i => i.available).length} dispo
                    </span>
                    {data.items.filter(i => !i.available).length > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '10px' }}>
                        {data.items.filter(i => !i.available).length} indispo
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}