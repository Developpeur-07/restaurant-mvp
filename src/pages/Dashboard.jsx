import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const STATUS_LABELS = {
  received: { label: "Reçue", bg: "#FFF9C4", color: "#7B6000" },
  preparing: { label: "En préparation", bg: "#DBEAFE", color: "#1E40AF" },
  ready: { label: "Prête", bg: "#DCFCE7", color: "#166534" },
  paid: { label: "Soldée", bg: "#F0FDF4", color: "#166534" },
  cancelled: { label: "Annulée", bg: "#F3F4F6", color: "#6B7280" },
};

const NEXT_STATUS = {
  received: "preparing",
  preparing: "ready",
  ready: "paid",
  paid: null,
  cancelled: null,
};

const NEXT_LABEL = {
  received: "Démarrer préparation",
  preparing: "Marquer prête",
  ready: "Marquer soldée 💰",
  paid: null,
  cancelled: null,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: resto } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (!resto) return;

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", resto.id)
        .not("status", "in", '("ready","paid")')
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
                ["ready", "paid"].includes(payload.new.status)
                  ? prev.filter((o) => o.id !== payload.new.id)
                  : prev.map((o) =>
                    o.id === payload.new.id ? payload.new : o,
                  ),
              );
            }
            if (payload.eventType === "DELETE") {
              setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
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

  async function markAsPaid(order) {
    await supabase.from("orders_archive").insert({ ...order, status: "paid" });
    await supabase.from("orders").delete().eq("id", order.id);
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
  }

  async function deleteOrder(orderId) {
    await supabase.from("orders").delete().eq("id", orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  if (loading)
    return (
      <div
        style={{
          background: "#FFF8F0",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#8B0000", fontFamily: "Georgia, serif" }}>
          Chargement...
        </p>
      </div>
    );

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  return (
    <div style={{ background: "#FFF8F0", minHeight: "100vh" }}>
      {/* HEADER */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)",
          padding: "28px 20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                color: "#C9A84C",
                fontSize: "0.65rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                margin: "0 0 4px",
                fontFamily: "Georgia, serif",
              }}
            >
              Tableau de bord
            </p>
            <h1
              style={{
                color: "#fff",
                fontSize: "1.5rem",
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              Le Bourgeois
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => navigate("/qrcode")}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: "600",
              }}
            >
              QR Code
            </button>
            <button
              onClick={() => navigate("/menu-manager")}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: "600",
              }}
            >
              📋 Menu
            </button>
            <button
              onClick={() => navigate("/settings")}
              style={{
                background: "#C9A84C",
                border: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: "600",
              }}
            >
              ⚙️ Paramètres
            </button>
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 16px" }}
      >
        {/* STATS */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "En cours", value: activeOrders.length, color: "#8B0000" },
            {
              label: "En préparation",
              value: orders.filter((o) => o.status === "preparing").length,
              color: "#1E40AF",
            },
            {
              label: "Annulées",
              value: cancelledOrders.length,
              color: "#6B7280",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: "12px",
                padding: "14px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(139,0,0,0.06)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  color: stat.color,
                  fontFamily: "Georgia, serif",
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.68rem",
                  color: "#999",
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* COMMANDES ACTIVES */}
        {activeOrders.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "48px 0", color: "#bbb" }}
          >
            <p style={{ fontSize: "3rem", margin: "0 0 12px" }}>🍽</p>
            <p style={{ fontFamily: "Georgia, serif" }}>
              Aucune commande en cours
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            {activeOrders.map((order) => {
              const config = STATUS_LABELS[order.status];
              const nextStatus = NEXT_STATUS[order.status];
              const nextLabel = NEXT_LABEL[order.status];
              const total = order.items.reduce(
                (s, i) => s + i.price * i.qty,
                0,
              );
              const estimatedTime = order.estimated_ready_at
                ? new Date(order.estimated_ready_at).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" },
                )
                : null;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "18px",
                    boxShadow: "0 2px 8px rgba(139,0,0,0.08)",
                    borderLeft: "4px solid #8B0000",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                          color: "#8B0000",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        Table {order.table_number}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "0.72rem",
                          color: "#999",
                        }}
                      >
                        #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                        {new Date(order.created_at).toLocaleTimeString(
                          "fr-FR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          background: config.bg,
                          color: config.color,
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        {config.label}
                      </span>
                      {estimatedTime && (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "0.72rem",
                            color: "#999",
                          }}
                        >
                          Prête à {estimatedTime}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #f0e8de",
                      paddingTop: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.85rem",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ color: "#333" }}>
                          <span
                            style={{ color: "#8B0000", fontWeight: "bold" }}
                          >
                            {item.qty}×
                          </span>{" "}
                          {item.name}
                        </span>
                        <span style={{ color: "#C9A84C", fontWeight: "600" }}>
                          {(item.price * item.qty).toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        borderTop: "1px solid #f0e8de",
                        paddingTop: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        fontSize: "0.88rem",
                      }}
                    >
                      <span>Total</span>
                      <span style={{ color: "#8B0000" }}>
                        {total.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>

                  {nextStatus && (
                    <button
                      onClick={() =>
                        order.status === "ready"
                          ? markAsPaid(order)
                          : updateStatus(order.id, nextStatus)
                      }
                      style={{
                        width: "100%",
                        background:
                          order.status === "ready" ? "#C9A84C" : "#8B0000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "11px",
                        fontWeight: "bold",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                      }}
                    >
                      {nextLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* COMMANDES ANNULÉES */}
        {cancelledOrders.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "4px",
                  height: "16px",
                  background: "#6B7280",
                  borderRadius: "2px",
                }}
              />
              <h2
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#6B7280",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Annulées
              </h2>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {cancelledOrders.map((order) => {
                const total = order.items.reduce(
                  (s, i) => s + i.price * i.qty,
                  0,
                );
                return (
                  <div
                    key={order.id}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "14px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      borderLeft: "4px solid #e0e0e0",
                      opacity: 0.75,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: "bold",
                            color: "#999",
                            fontSize: "0.9rem",
                          }}
                        >
                          Table {order.table_number}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "0.7rem",
                            color: "#bbb",
                          }}
                        >
                          #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                          {total.toLocaleString()} FCFA
                        </p>
                      </div>
                      <button
                        onClick={() => deleteOrder(order.id)}
                        style={{
                          background: "#fee2e2",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          color: "#dc2626",
                          fontWeight: "600",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        🗑 Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
        <button
          onClick={() => navigate("/history")}
          style={{
            width: "100%",
            background: "transparent",
            border: "2px solid #e8ddd4",
            borderRadius: "12px",
            padding: "12px",
            color: "#8B0000",
            fontWeight: "600",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}
        >
          📊 Voir l'historique des ventes
        </button>
      </div>
    </div>
  );
}
