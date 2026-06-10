import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_CONFIG = {
  received: {
    label: 'Commande reçue',
    sublabel: 'Votre commande a été transmise en cuisine',
    color: 'bg-yellow-500',
    step: 1
  },
  preparing: {
    label: 'En préparation',
    sublabel: 'Nos équipes préparent votre commande',
    color: 'bg-blue-500',
    step: 2
  },
  ready: {
    label: 'Prête !',
    sublabel: 'Votre commande est prête, rendez-vous en caisse',
    color: 'bg-green-500',
    step: 3
  }
}

export default function Tracking() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      setOrder(data)
      setLoading(false)
    }

    fetchOrder()

    // Realtime — écoute les changements de statut
    const channel = supabase
      .channel('order-' + orderId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        payload => {
          setOrder(payload.new)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [orderId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Chargement...</p>
    </div>
  )

  if (!order) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-500">Commande introuvable.</p>
    </div>
  )

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.received
  const estimatedTime = order.estimated_ready_at
    ? new Date(order.estimated_ready_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <div className="max-w-md mx-auto px-4 py-8">

      {/* Statut principal */}
      <div className={`${config.color} rounded-2xl p-6 text-white text-center mb-6`}>
        <p className="text-3xl font-bold mb-1">{config.label}</p>
        <p className="text-sm opacity-80">{config.sublabel}</p>
        {estimatedTime && order.status !== 'ready' && (
          <p className="mt-3 text-lg font-semibold">
            Prête à {estimatedTime}
          </p>
        )}
      </div>

      {/* Barre de progression */}
      <div className="flex items-center justify-between mb-8 px-2">
        {['received', 'preparing', 'ready'].map((s, i) => {
          const done = STATUS_CONFIG[s].step <= config.step
          return (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              {i < 2 && (
                <div className={`flex-1 h-1 mx-1 ${STATUS_CONFIG[s].step < config.step ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Détails commande */}
      <div className="border rounded-xl p-4 bg-white shadow-sm mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-3">
          <span>Table {order.table_number}</span>
          <span>Commande #{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.qty}× {item.name}</span>
              <span className="font-medium">{(item.price * item.qty).toLocaleString()} FCFA</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{total.toLocaleString()} FCFA</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Cette page se met à jour automatiquement
      </p>
    </div>
  )
}