import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Menu() {
  const { restaurantId } = useParams()
  const [items, setItems] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

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
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-2">{restaurant.name}</h1>
      <p className="text-center text-gray-500 text-sm mb-8">
        Sélectionnez vos articles
      </p>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="flex justify-between items-center border rounded-xl p-4 bg-white shadow-sm"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-400">~{item.estimated_minutes} min</p>
            </div>
            <p className="font-bold text-green-600">
              {item.price.toLocaleString()} FCFA
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}