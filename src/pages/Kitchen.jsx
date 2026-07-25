import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";
import { useStaff } from "../hooks/useStaff";
import { Bell, ChefHat, UtensilsCrossed, ShoppingBag, Sun, Moon } from "lucide-react";

function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
    gain1.gain.setValueAtTime(0.8, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
  } catch {
    console.log('Audio non supporté');
  }
}

export default function Kitchen() {
  const { restaurantId, role, restaurantName, restaurantBrand, loading: staffLoading } = useStaff();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const primaryColor = restaurantBrand?.primary_color || '#8B0000';
  const { theme, darkMode, toggleDarkMode } = useTheme(primaryColor);

  // ─── INIT + Realtime, dépend de restaurantId (résolu via restaurant_staff) ───
  useEffect(() => {
    if (!restaurantId) return;

    let channel;

    async function init() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "preparing")
        .order("created_at", { ascending: true });

      setOrders(data || []);
      setLoading(false);

      channel = supabase
        .channel("kitchen-" + restaurantId)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        }, (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const order = payload.new;
            if (order.status === "preparing") {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === order.id);
                if (!exists) {
                  playNotification();
                  setNewOrderAlert(true);
                  setTimeout(() => setNewOrderAlert(false), 3000);
                  return [...prev, order];
                }
                return prev.map((o) => (o.id === order.id ? order : o));
              });
            } else {
              // La commande a bougé hors de "preparing" (marquée prête,
              // annulée par la réception...) — elle sort de la vue cuisine.
              setOrders((prev) => prev.filter((o) => o.id !== order.id));
            }
          }
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        })
        .subscribe();
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  async function markReady(orderId) {
    if (processingOrderId === orderId) return;
    setProcessingOrderId(orderId);

    // Source unique de vérité : la RPC applique déjà la restriction
    // preparing -> ready uniquement pour un compte cuisine (défense en
    // profondeur avec la RLS kitchen_advance_to_ready posée en Phase A).
    const { error } = await supabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: 'ready',
    });

    if (error) {
      console.error("Erreur mise à jour statut", error);
      alert('Action impossible : ' + error.message);
    } else {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
    setProcessingOrderId(null);
  }

  if (staffLoading || loading)
    return (
      <div style={{ background: theme.pageBackground, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: theme.textPrimary, fontFamily: "Georgia, serif" }}>Chargement...</p>
      </div>
    );

  if (role !== "kitchen")
    return (
      <div style={{ background: theme.pageBackground, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <p style={{ color: theme.textPrimary, textAlign: "center" }}>
          Ce compte n'a pas accès au dashboard cuisine.
        </p>
      </div>
    );

  return (
    <div style={{ background: theme.pageBackground, minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}CC, ${primaryColor})`,
        padding: '20px 20px', position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#C9A84C', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
              Dashboard cuisine
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.3rem', fontFamily: 'Georgia, serif', margin: 0 }}>
              {restaurantName || 'Restaurant'}
            </h1>
            {newOrderAlert && (
              <div style={{
                background: '#C9A84C', borderRadius: '20px', padding: '4px 10px',
                fontSize: '0.72rem', fontWeight: 'bold', color: '#fff',
                animation: 'pulse 0.5s ease infinite alternate',
                marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                <Bell size={12} /> Nouvelle commande !
              </div>
            )}
          </div>
          <button
            onClick={toggleDarkMode}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px 10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px" }}>

        {/* COMPTEUR */}
        <div style={{
          background: theme.cardBackground, borderRadius: '12px', padding: '14px',
          textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 'bold', color: theme.textPrimary, fontFamily: 'Georgia, serif' }}>
            {orders.length}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: theme.textSecondary }}>
            commande(s) en préparation
          </p>
        </div>

        {/* COMMANDES EN PRÉPARATION */}
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: theme.textSecondary }}>
            <ChefHat size={48} style={{ margin: "0 0 12px" }} />
            <p style={{ fontFamily: "Georgia, serif" }}>
              Aucune commande en préparation
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {orders.map((order) => {
              const estimatedTime = order.estimated_ready_at
                ? new Date(order.estimated_ready_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <div
                  key={order.id}
                  style={{
                    background: theme.cardBackground,
                    borderRadius: "16px",
                    padding: "18px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    borderLeft: `4px solid ${theme.primary}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: theme.primary, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {order.order_type === 'emporter'
                          ? <><ShoppingBag size={15} /> {order.customer_name}</>
                          : <><UtensilsCrossed size={15} /> Table {order.table_number}</>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: theme.textSecondary }}>
                        #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                        {new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {estimatedTime && (
                      <span style={{
                        background: '#DBEAFE', color: '#1E40AF', fontSize: "0.72rem",
                        fontWeight: "600", padding: "4px 10px", borderRadius: "20px",
                      }}>
                        Prête à {estimatedTime}
                      </span>
                    )}
                  </div>

                  <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: "12px", marginBottom: "14px" }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                        <span style={{ color: theme.textPrimary }}>
                          <span style={{ color: theme.textPrimary, fontWeight: "bold" }}>{item.qty}×</span> {item.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={processingOrderId === order.id}
                    onClick={() => markReady(order.id)}
                    style={{
                      width: "100%",
                      background: theme.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "11px",
                      fontWeight: "bold",
                      fontSize: "0.88rem",
                      cursor: processingOrderId === order.id ? "not-allowed" : "pointer",
                      opacity: processingOrderId === order.id ? 0.6 : 1,
                    }}
                  >
                    Marquer prête
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}