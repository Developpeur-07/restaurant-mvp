import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";

const STATUS_CONFIG = {
  received: {
    label: "Commande reçue",
    sublabel: " Nos équipes préparent votre commande",
    step: 1,
  },
  preparing: {
    label: "En préparation",
    sublabel: "Votre commande a été transmise en cuisine",
    step: 2,
  },
  ready: {
    label: "Prête !",
    sublabel: "Rendez-vous en caisse pour récupérer votre commande",
    step: 3,
  },
  
    served:{
        label:"Servie",
        sublabel:"Votre commande a été servie.",
        step:4
    },
    paid:{
        label:"Commande payée",
        sublabel:"Merci de votre visite.",
        step:5
    },
  cancelled: {
    label: "Commande annulée",
    sublabel: "Votre commande a été annulée",
    step: 0,
  },
};

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      setOrder(data);
      setLoading(false);

      if (data) {
        const { data: resto } = await supabase
          .from("restaurants")
          .select("name, primary_color, secondary_color, slogan, address, logo_url")
          .eq("id", data.restaurant_id)
          .single();
        setRestaurant(resto);
      }
    }

    fetchOrder();

    const channel = supabase
      .channel("order-" + orderId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => setOrder(payload.new),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [orderId]);

  // ── THÈME — hook appelé avant tout return conditionnel (règle des Hooks) ──
  const { theme, darkMode, toggleDarkMode } = useTheme(restaurant?.primary_color);

  if (loading)
    return (
      <div
        style={{
          background: theme.pageBackground,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: theme.textPrimary, fontFamily: "Georgia, serif" }}>
          Chargement...
        </p>
      </div>
    );

  if (!order)
    return (
      <div
        style={{
          background: theme.pageBackground,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: theme.textPrimary }}>Commande introuvable.</p>
      </div>
    );

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
  const estimatedTime = order.estimated_ready_at
    ? new Date(order.estimated_ready_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;
  const total = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const isReady = order.status === "ready";
  const isCancelled = order.status === "cancelled";
  const now = Date.now();

  const orderAge = order ? now - new Date(order.created_at).getTime() : 0;
  const canCancel = order && order.status === "received" && orderAge < 5 * 60 * 1000;

  // Couleur du bandeau de statut, dérivée du thème du restaurant
  const statusGradient = isCancelled
    ? "linear-gradient(135deg, #444, #666)"
    : isReady
      ? "linear-gradient(135deg, #1a6b1a, #2d8b2d)"
      : `linear-gradient(135deg, ${theme.primary}, ${theme.primary}DD)`;

  return (
    <div style={{ background: theme.pageBackground, minHeight: "100vh" }}>

      {/* HEADER — fond dynamique selon couleur du restaurant + bouton dark mode */}
      <div
        style={{
          background: `linear-gradient(135deg, ${restaurant?.primary_color || theme.primary}, ${restaurant?.primary_color || theme.primary}CC)`,
          padding: "28px 20px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          onClick={toggleDarkMode}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "8px",
            padding: "8px 10px",
            cursor: "pointer",
            fontSize: "1rem",
            position: "absolute",
            top: "16px",
            right: "16px",
          }}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {restaurant?.logo_url && (
          <img
            src={restaurant.logo_url}
            alt="logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "8px",
              border: `2px solid ${restaurant.secondary_color || theme.borderLight}`,
            }}
          />
        )}
        <p
          style={{
            color: restaurant?.secondary_color || "#C9A84C",
            fontSize: "0.7rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: "4px",
            fontFamily: "Georgia, serif",
          }}
        >
          {restaurant?.slogan || "Patisserie · Snack · Restaurant"}
        </p>
        <h1 style={{ color: "#fff", fontSize: "1.6rem", fontFamily: "Georgia, serif", margin: "0 0 4px" }}>
          {restaurant?.name || "Restaurant"}
        </h1>
        <div
          style={{
            width: "40px",
            height: "2px",
            background: restaurant?.secondary_color || "#C9A84C",
            margin: "8px auto",
          }}
        />
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px" }}>

        {/* STATUT PRINCIPAL — couleur dérivée du thème, plus de gradient fixe sur le texte */}
        <div
          style={{
            background: statusGradient,
            borderRadius: "16px",
            padding: "28px 20px",
            textAlign: "center",
            marginBottom: "24px",
            boxShadow: `0 4px 20px ${theme.primary}40`,
          }}
        >
          <p style={{ fontSize: "2.5rem", margin: "0 0 8px" }}>
            {order.status === "received"
              ? "🧾"
              : order.status === "preparing"
                ? "👨‍🍳"
                : order.status === "cancelled"
                  ? "❌"
                  : "✅"}
          </p>
          <p
            style={{
              color: "#fff",
              fontSize: "1.4rem",
              fontWeight: "bold",
              fontFamily: "Georgia, serif",
              margin: "0 0 6px",
            }}
          >
            {config.label}
          </p>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", margin: 0 }}>
            {config.sublabel}
          </p>
          {estimatedTime && !isReady && !isCancelled && (
            <div
              style={{
                marginTop: "16px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "8px",
                padding: "10px 16px",
                display: "inline-block",
              }}
            >
              <p style={{ color: "#C9A84C", fontWeight: "bold", fontSize: "1.1rem", margin: 0 }}>
                Prête à {estimatedTime}
              </p>
            </div>
          )}
        </div>

        {/* BARRE DE PROGRESSION — couleurs liées au thème, adaptées au dark mode */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px", padding: "0 8px" }}>
          {["received", "preparing", "ready"].map((s, i) => {
            const done = STATUS_CONFIG[s].step <= config.step;
            const labels = ["Reçue", "Préparation", "Prête"];
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: done ? theme.primary : theme.borderLight,
                      color: done ? "#fff" : theme.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.65rem",
                      color: done ? theme.textPrimary : theme.textMuted,
                      fontWeight: done ? "bold" : "normal",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {labels[i]}
                  </p>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: "2px",
                      margin: "0 4px 16px",
                      background: STATUS_CONFIG[s].step < config.step ? theme.primary : theme.borderLight,
                      transition: "background 0.3s ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* BOUTON ANNULER — visible 5 min max après réception, guard anti double-clic */}
        {canCancel && (
          <div style={{ marginBottom: "16px" }}>
            <button
              disabled={cancelling}
              onClick={async () => {
                const confirm = window.confirm("Annuler cette commande ?");
                if (!confirm) return;
                setCancelling(true);
                await supabase
                  .from("orders")
                  .update({ status: "cancelled" })
                  .eq("id", orderId);
                setCancelling(false);
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: `2px solid ${theme.primary}`,
                borderRadius: "12px",
                padding: "12px",
                color: theme.primary,
                fontWeight: "bold",
                fontSize: "0.9rem",
                cursor: cancelling ? "not-allowed" : "pointer",
                fontFamily: "Georgia, serif",
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? "Annulation..." : "Annuler la commande"}
            </button>
          </div>
        )}

        {/* DÉTAIL COMMANDE — card avec fond thème, opacité correcte en dark mode */}
        <div
          style={{
            background: theme.cardBackground,
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <p style={{ margin: 0, fontWeight: "bold", color: theme.textPrimary, fontFamily: "Georgia, serif" }}>
                {order.order_type === "emporter"
                  ? `🥡 À emporter — ${order.customer_name}`
                  : `🪑 Table ${order.table_number}`}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: theme.textSecondary }}>
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: theme.textSecondary }}>
                Commandé à
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: theme.textPrimary, fontWeight: "600" }}>
                {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: "16px" }}>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: theme.textPrimary, fontSize: "0.88rem" }}>
                  <span style={{ color: theme.textPrimary, fontWeight: "bold" }}>{item.qty}×</span> {item.name}
                </span>
                <span style={{ color: "#C9A84C", fontWeight: "bold", fontSize: "0.88rem" }}>
                  {(item.price * item.qty).toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: `2px solid ${theme.textPrimary}20`,
              marginTop: "12px",
              paddingTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: "bold", color: theme.textPrimary, fontFamily: "Georgia, serif" }}>
              Total
            </span>
            <span style={{ fontWeight: "bold", color: theme.textPrimary, fontSize: "1.1rem" }}>
              {total.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: theme.textSecondary, marginTop: "20px" }}>
          Cette page se met à jour automatiquement
        </p>
      </div>
    </div>
  );
}