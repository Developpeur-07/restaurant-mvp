import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Menu() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState({})
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
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty
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
  const maxMinutes = selectedItems.length
    ? Math.max(...selectedItems.map(i => i.estimated_minutes))
    : 0

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Chargement du menu...</p>
    </div>
  )

  if (!restaurant) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">Restaurant introuvable.</p>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl font-bold text-center mb-2">{restaurant.name}</h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        Sélectionnez vos articles
      </p>

      <div className="space-y-3">
        {items.map(item => {
          const qty = selection[item.id]?.qty || 0
          return (
            <div key={item.id} className="flex justify-between items-center border rounded-xl p-4 bg-white shadow-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-400">~{item.estimated_minutes} min</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-green-600">
                  {item.price.toLocaleString()} FCFA
                </p>
                {qty === 0 ? (
                  <button
                    onClick={() => addItem(item)}
                    className="w-8 h-8 rounded-full hover:bg-green-500 cursor-pointer bg-green-600 text-white font-bold text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 rounded-full cursor-pointer hover:bg-gray-300 bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-bold">{qty}</span>
                    <button
                      onClick={() => addItem(item)}
                      className="w-8 h-8 rounded-full cursor-pointer hover:bg-green-500 bg-green-600 text-white font-bold text-lg flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>{selectedItems.reduce((s, i) => s + i.qty, 0)} article(s)</span>
              <span>~{maxMinutes} min</span>
            </div>
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">{total.toLocaleString()} FCFA</p>
              <button
                onClick={() => setShowModal(true)} 
                className="bg-green-600 hover:bg-green-700 cursor-pointer text-white px-6 py-2 rounded-xl font-bold"
              >
                Commander →
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Votre numéro de table</h2>
            <input
              type="number"
              placeholder="Ex: 4"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-xl text-center mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border rounded-xl py-3 text-gray-600 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={submitOrder}
                disabled={!tableNumber || submitting}
                className="flex-1 bg-green-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}