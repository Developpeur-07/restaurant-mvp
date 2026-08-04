import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";
import {
  Sun, Moon, ReceiptText,
  ChefHat,
  CircleX,
  ShoppingBag,
  UtensilsCrossed,
  CircleCheckBig,
  Receipt,
  Check,
} from "lucide-react";

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
  served: {
    label: "Servie",
    sublabel: "Votre commande a été servie.",
    step: 4
  },
  paid: {
    label: "Commande payée",
    sublabel: "Merci de votre visite.",
    step: 5
  },
  cancelled: {
    label: "Commande annulée",
    sublabel: "Votre commande a été annulée",
    step: 0,
  },
};

// Config compacte pour les cards "autres commandes de la table"
const STATUS_BADGE = {
  received: { label: "Reçue", bg: "#FFF9C4", color: "#7B6000" },
  preparing: { label: "En préparation", bg: "#DBEAFE", color: "#1E40AF" },
  ready: { label: "Prête", bg: "#DCFCE7", color: "#166534" },
  served: { label: "Servie", bg: "#E0E7FF", color: "#3730A3" },
  paid: { label: "Payée", bg: "#F0FDF4", color: "#166534" },
  cancelled: { label: "Annulée", bg: "#F3F4F6", color: "#6B7280" },
};

export default function Tracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [siblingOrders, setSiblingOrders] = useState([]); // autres commandes de la même session
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let channel;
    let cancelled = false;

    async function init() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (cancelled) return;
      setOrder(data);
      setLoading(false);

      if (!data) return;

      const { data: resto } = await supabase
        .from("restaurants")
        .select("name, primary_color, secondary_color, slogan, address, logo_url")
        .eq("id", data.restaurant_id)
        .single();
      if (!cancelled) setRestaurant(resto);

      // ── Commandes sœurs de la même session (table) ──
      if (data.session_id) {
        const { data: siblings } = await supabase
          .from("orders")
          .select("*")
          .eq("session_id", data.session_id)
          .neq("id", orderId)
          .order("created_at", { ascending: true });
        if (!cancelled) setSiblingOrders(siblings || []);
      }

      // ── Realtime : scope session si dispo, sinon commande seule (emporter) ──
      const filter = data.session_id
        ? `session_id=eq.${data.session_id}`
        : `id=eq.${orderId}`;

      channel = supabase
        .channel("tracking-" + (data.session_id || orderId))
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter },
          (payload) => {
            if (payload.eventType === "DELETE") {
              setSiblingOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
              return;
            }
            const updated = payload.new;
            if (updated.id === orderId) {
              setOrder(updated);
            } else {
              setSiblingOrders((prev) => {
                const exists = prev.some((o) => o.id === updated.id);
                return exists
                  ? prev.map((o) => (o.id === updated.id ? updated : o))
                  : [...prev, updated];
              });
            }
          },
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
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

  // ── Total de session (commande courante + commandes sœurs, hors annulées) ──
  const hasSession = siblingOrders.length > 0;
  const sessionTotal = hasSession
    ? [order, ...siblingOrders]
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0)
    : total;

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
          padding: "32px 20px 28px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          onClick={toggleDarkMode}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "#fff",
            borderRadius: "10px",
            padding: "9px 11px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            position: "absolute",
            top: "18px",
            right: "18px",
          }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
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
              marginBottom: "10px",
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
            marginBottom: "6px",
            fontFamily: "Georgia, serif",
          }}
        >
          {restaurant?.slogan || "Patisserie · Snack · Restaurant"}
        </p>
        <h1 style={{ color: "#fff", fontSize: "1.6rem", fontFamily: "Georgia, serif", margin: "0 0 6px" }}>
          {restaurant?.name || "Restaurant"}
        </h1>
        <div
          style={{
            width: "40px",
            height: "2px",
            background: restaurant?.secondary_color || "#C9A84C",
            margin: "10px auto",
          }}
        />
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "28px 18px" }}>

        {/* Bandeau table — visible seulement si on est bien en session multi-commandes */}
        {hasSession && (
          <div style={{
            background: theme.cardBackground,
            border: `1px dashed ${theme.borderLight}`,
            borderRadius: "16px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}>
            <UtensilsCrossed size={15} color={theme.textSecondary} />
            <p style={{ margin: 0, fontSize: "0.78rem", color: theme.textSecondary }}>
              Table {order.table_number} · {siblingOrders.length + 1} commande{siblingOrders.length + 1 > 1 ? "s" : ""} sur cette session
            </p>
          </div>
        )}

        {/* STATUT PRINCIPAL — couleur dérivée du thème, plus de gradient fixe sur le texte */}
        <div
          style={{
            background: statusGradient,
            borderRadius: "20px",
            padding: "32px 22px",
            textAlign: "center",
            marginBottom: "28px",
            boxShadow: `0 4px 20px ${theme.primary}40`,
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {order.status === "received" ? (
              <ReceiptText size={40} color={theme.primary} />
            ) : order.status === "preparing" ? (
              <ChefHat size={40} color="#1E40AF" />
            ) : order.status === "cancelled" ? (
              <CircleX size={40} color="#DC2626" />
            ) : (
              <CircleCheckBig size={40} color="#16A34A" />
            )}
          </p>
          <p
            style={{
              color: "#fff",
              fontSize: "1.4rem",
              fontWeight: "bold",
              fontFamily: "Georgia, serif",
              margin: "0 0 8px",
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
                marginTop: "18px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "10px",
                padding: "11px 18px",
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
        <div style={{ display: "flex", alignItems: "center", marginBottom: "28px", padding: "0 8px" }}>
          {["received", "preparing", "ready"].map((s, i) => {
            const done = STATUS_CONFIG[s].step <= config.step;
            const labels = ["Reçue", "Préparation", "Prête"];
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
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
                    {done ? <Check size={16} /> : i + 1}
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
                      margin: "0 4px 18px",
                      background: STATUS_CONFIG[s].step < config.step ? theme.primary : theme.borderLight,
                      transition: "background 0.3s ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* BOUTON ANNULER — migré vers la RPC transition_order_status (gère déjà
            la règle received->cancelled, anonyme, fenêtre de 5 min) au lieu
            d'un update direct */}
        {canCancel && (
          <div style={{ marginBottom: "20px" }}>
            <button
              disabled={cancelling}
              onClick={async () => {
                const confirm = window.confirm("Annuler cette commande ?");
                if (!confirm) return;
                setCancelling(true);
                const { error } = await supabase.rpc('transition_order_status', {
                  p_order_id: orderId,
                  p_new_status: 'cancelled',
                });
                if (error) {
                  alert("Annulation impossible : " + error.message);
                }
                setCancelling(false);
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: `2px solid ${theme.primary}`,
                borderRadius: "14px",
                padding: "13px",
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
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            marginBottom: hasSession ? "20px" : "0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "18px" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                {order.order_type === 'emporter'
                  ? <><ShoppingBag size={15} /> {order.customer_name}</>
                  : <><UtensilsCrossed size={15} /> Table {order.table_number}</>}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: theme.textSecondary }}>
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: theme.textSecondary }}>
                Commandé à
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: theme.textPrimary, fontWeight: "600" }}>
                {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: "18px" }}>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
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
              marginTop: "14px",
              paddingTop: "14px",
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

        {/* AUTRES COMMANDES DE LA TABLE — n'apparaît que si la session en a d'autres */}
        {hasSession && (
          <div
            style={{
              background: theme.cardBackground,
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: "0.85rem", color: theme.textPrimary, fontFamily: "Georgia, serif" }}>
              Autres commandes de cette table
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
              {siblingOrders.map((sib) => {
                const badge = STATUS_BADGE[sib.status] || STATUS_BADGE.received;
                const sibTotal = sib.items.reduce((s, i) => s + i.price * i.qty, 0);
                return (
                  <div
                    key={sib.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", background: theme.pageBackground, borderRadius: "12px",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: theme.textPrimary, fontWeight: "600" }}>
                        #{sib.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: theme.textSecondary }}>
                        {sib.items.reduce((n, i) => n + i.qty, 0)} article(s) · {sibTotal.toLocaleString()} FCFA
                      </p>
                    </div>
                    <span style={{
                      background: badge.bg, color: badge.color, fontSize: "0.68rem",
                      fontWeight: "600", padding: "4px 10px", borderRadius: "20px",
                    }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderTop: `2px solid ${theme.textPrimary}20`,
                paddingTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: "bold", color: theme.textPrimary, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: "7px" }}>
                <Receipt size={15} /> Total table
              </span>
              <span style={{ fontWeight: "bold", color: theme.textPrimary, fontSize: "1.1rem" }}>
                {sessionTotal.toLocaleString()} FCFA
              </span>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: theme.textSecondary, marginTop: "24px" }}>
          Cette page se met à jour automatiquement
        </p>
      </div>
    </div>
  );
}