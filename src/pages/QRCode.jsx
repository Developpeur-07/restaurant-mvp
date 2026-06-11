import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

export default function QRCodePage() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setRestaurant(resto)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Chargement...</p>
    </div>
  )

  if (!restaurant) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">Restaurant introuvable.</p>
    </div>
  )

  const menuUrl = `${window.location.origin}/menu/${restaurant.id}`

  return (
    <div className="max-w-sm mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>
      <p className="text-gray-500 text-sm mb-8">
        Affichez ce QR code sur vos tables
      </p>

      <div className="bg-white border rounded-2xl p-8 shadow-sm inline-block mb-8">
        <QRCodeSVG
          value={menuUrl}
          size={220}
          level="H"
          includeMargin={false}
        />
      </div>

      <p className="text-xs text-gray-400 mb-8 break-all">{menuUrl}</p>

      <button
        onClick={() => window.print()}
        className="w-full bg-green-600 hover:bg-green-700 transition-colors text-white rounded-xl py-3 font-bold"
      >
        Imprimer le QR code
      </button>
    </div>
  )
}