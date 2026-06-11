import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const STATUS_LABELS = {
  received: { label: "Reçue", color: "bg-yellow-100 text-yellow-800" },
  preparing: { label: "En préparation", color: "bg-blue-100 text-blue-800" },
  ready: { label: "Prête", color: "bg-green-100 text-green-800" },
};

const NEXT_STATUS = {
  received: "preparing",
  preparing: "ready",
  ready: null,
};

const NEXT_LABEL = {
  received: "Démarrer préparation",
  preparing: "Marquer prête",
  ready: null,
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    let channel;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: resto } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!resto) return;

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", resto.id)
        .neq("status", "ready")
        .order("created_at", { ascending: true });

      setOrders(data || []);
      setLoading(false);

      channel = supabase
        .channel("dashboard-" + resto.id)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${resto.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setOrders((prev) => [...prev, payload.new]);
            }
            if (payload.eventType === "UPDATE") {
              setOrders((prev) =>
                payload.new.status === "ready"
                  ? prev.filter((o) => o.id !== payload.new.id)
                  : prev.map((o) =>
                      o.id === payload.new.id ? payload.new : o,
                    ),
              );
            }
          },
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(orderId, newStatus) {
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Commandes en cours</h1>
        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
          {orders.length} active(s)
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🍽</p>
          <p>Aucune commande en cours</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = STATUS_LABELS[order.status];
            const nextStatus = NEXT_STATUS[order.status];
            const nextLabel = NEXT_LABEL[order.status];
            const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
            const estimatedTime = order.estimated_ready_at
              ? new Date(order.estimated_ready_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            return (
              <div
                key={order.id}
                className="border rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg">
                      Table {order.table_number}
                    </p>
                    <p className="text-xs text-gray-400">
                      #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                      {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${config.color}`}
                    >
                      {config.label}
                    </span>
                    {estimatedTime && (
                      <p className="text-xs text-gray-400 mt-1">
                        Prête à {estimatedTime}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {item.qty}× {item.name}
                      </span>
                      <span className="text-gray-500">
                        {(item.price * item.qty).toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span>{total.toLocaleString()} FCFA</span>
                  </div>
                </div>

                {nextStatus && (
                  <button
                    onClick={() => updateStatus(order.id, nextStatus)}
                    className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors duration-150 text-white rounded-xl py-2 font-bold text-sm cursor-pointer"
                  >
                    {nextLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
