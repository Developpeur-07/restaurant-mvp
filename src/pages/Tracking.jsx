import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_CONFIG = {
  received: {
    label: "Commande reçue",
    sublabel: "Votre commande a été transmise en cuisine",
    step: 1,
  },
  preparing: {
    label: "En préparation",
    sublabel: "Nos équipes préparent votre commande",
    step: 2,
  },
  ready: {
    label: "Prête !",
    sublabel: "Rendez-vous en caisse pour récupérer votre commande",
    step: 3,
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

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      setOrder(data);
      setLoading(false);
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

  if (!order)
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
        <p style={{ color: "#8B0000" }}>Commande introuvable.</p>
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

  return (
    <div style={{ background: "#FFF8F0", minHeight: "100vh" }}>
      {/* HEADER */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #6B0000 0%, #8B0000 60%, #A50000 100%)",
          padding: "28px 20px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#C9A84C",
            fontSize: "0.7rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: "4px",
            fontFamily: "Georgia, serif",
          }}
        >
          Patisserie · Snack · Restaurant
        </p>
        <h1
          style={{
            color: "#fff",
            fontSize: "1.6rem",
            fontFamily: "Georgia, serif",
            margin: "0 0 4px",
          }}
        >
          Le Bourgeois
        </h1>
        <div
          style={{
            width: "40px",
            height: "2px",
            background: "#C9A84C",
            margin: "8px auto",
          }}
        />
      </div>

      <div
        style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px" }}
      >
        {/* STATUT PRINCIPAL */}
        <div
          style={{
            background: isReady
              ? "linear-gradient(135deg, #1a6b1a, #2d8b2d)"
              : "linear-gradient(135deg, #6B0000, #8B0000)",
            borderRadius: "16px",
            padding: "28px 20px",
            textAlign: "center",
            marginBottom: "24px",
            boxShadow: "0 4px 20px rgba(139,0,0,0.25)",
          }}
        >
          <p
            style={{
              fontSize: "2.5rem",
              margin: "0 0 8px",
              background:
                order.status === "cancelled"
                  ? "linear-gradient(135deg, #333, #555)"
                  : isReady
                    ? "linear-gradient(135deg, #1a6b1a, #2d8b2d)"
                    : "linear-gradient(135deg, #6B0000, #8B0000)",
                    
            }}
          >
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
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.8rem",
              margin: 0,
            }}
          >
            {config.sublabel}
          </p>
          {estimatedTime && !isReady && (
            <div
              style={{
                marginTop: "16px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "8px",
                padding: "10px 16px",
                display: "inline-block",
              }}
            >
              <p
                style={{
                  color: "#C9A84C",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  margin: 0,
                }}
              >
                Prête à {estimatedTime}
              </p>
            </div>
          )}
        </div>

        {/* BARRE DE PROGRESSION */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            padding: "0 8px",
          }}
        >
          {["received", "preparing", "ready"].map((s, i) => {
            const done = STATUS_CONFIG[s].step <= config.step;
            const labels = ["Reçue", "Préparation", "Prête"];
            return (
              <div
                key={s}
                style={{ display: "flex", alignItems: "center", flex: 1 }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: done ? "#8B0000" : "#e0d5c8",
                      color: done ? "#fff" : "#999",
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
                      color: done ? "#8B0000" : "#999",
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
                      background:
                        STATUS_CONFIG[s].step < config.step
                          ? "#8B0000"
                          : "#e0d5c8",
                      transition: "background 0.3s ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* BOUTON ANNULER — visible seulement si statut received */}
        {order.status === "received" && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={async () => {
                const confirm = window.confirm("Annuler cette commande ?");
                if (!confirm) return;
                await supabase
                  .from("orders")
                  .update({ status: "cancelled" })
                  .eq("id", orderId);
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: "2px solid #8B0000",
                borderRadius: "12px",
                padding: "12px",
                color: "#8B0000",
                fontWeight: "bold",
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              Annuler la commande
            </button>
          </div>
        )}

        {/* DÉTAIL COMMANDE */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(139,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: "bold",
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
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#999" }}>
                Commandé à
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.8rem",
                  color: "#333",
                  fontWeight: "600",
                }}
              >
                {new Date(order.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f0e8de", paddingTop: "16px" }}>
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ color: "#333", fontSize: "0.88rem" }}>
                  <span style={{ color: "#8B0000", fontWeight: "bold" }}>
                    {item.qty}×
                  </span>{" "}
                  {item.name}
                </span>
                <span
                  style={{
                    color: "#C9A84C",
                    fontWeight: "bold",
                    fontSize: "0.88rem",
                  }}
                >
                  {(item.price * item.qty).toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "2px solid #8B0000",
              marginTop: "12px",
              paddingTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: "bold",
                color: "#1a1a1a",
                fontFamily: "Georgia, serif",
              }}
            >
              Total
            </span>
            <span
              style={{
                fontWeight: "bold",
                color: "#8B0000",
                fontSize: "1.1rem",
              }}
            >
              {total.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.72rem",
            color: "#bbb",
            marginTop: "20px",
          }}
        >
          Cette page se met à jour automatiquement
        </p>
      </div>
    </div>
  );
}
