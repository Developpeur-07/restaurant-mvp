import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/useTheme";
import { useSubscription } from "../hooks/useSubscription";

export default function QRCodePage() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── THÈME — appelé inconditionnellement, avant tout return ──
  const { theme, darkMode, toggleDarkMode } = useTheme(restaurant?.primary_color);

  // ── ABONNEMENT — vient du SubscriptionProvider posé par AdminRoute ──
  const { features } = useSubscription();
  const hasCustomBranding = features.customBranding;

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: resto } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      setRestaurant(resto);
      setLoading(false);
    }
    init();
  }, []);

  if (loading)
    return (
      <div style={{ background: theme.pageBackground, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: theme.primary, fontFamily: "Georgia, serif" }}>Chargement...</p>
      </div>
    );

  if (!restaurant)
    return (
      <div style={{ background: theme.pageBackground, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: theme.primary }}>Restaurant introuvable.</p>
      </div>
    );

  const menuUrl = `${window.location.origin}/menu/${restaurant.id}`;

  // Sans le plan payant, l'en-tête retombe sur la couleur neutre du thème
  // plutôt que sur la couleur personnalisée du restaurant.
  const headerColor = hasCustomBranding ? (restaurant.primary_color || theme.primary) : theme.primary;

  return (
    <div style={{ background: theme.pageBackground, minHeight: "100vh" }}>

      {/* HEADER */}
      <div
        style={{
          background: `linear-gradient(135deg, ${headerColor}CC, ${headerColor})`,
          padding: "20px 20px",
        }}
      >
        <div style={{ maxWidth: "420px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
          >
            ← Retour
          </button>
          <button
            onClick={toggleDarkMode}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", fontSize: "1rem" }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "380px", margin: "0 auto", padding: "48px 20px", textAlign: "center" }}>
        <h1 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1.5rem", margin: "0 0 8px" }}>
          {restaurant.name}
        </h1>
        <p style={{ color: theme.textSecondary, fontSize: "0.85rem", marginBottom: hasCustomBranding ? "32px" : "12px" }}>
          Affichez ce QR code sur vos tables
        </p>

        {!hasCustomBranding && (
          <div style={{
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "24px",
            fontSize: "0.78rem",
            color: "#92400E",
            textAlign: "center"
          }}>
            🔒 Couleur personnalisée désactivée (mode gratuit) — réactivez l'abonnement pour appliquer les couleurs de votre restaurant au QR code
          </div>
        )}

        <div
          style={{
            background: theme.cardBackground,
            border: `1px solid ${theme.borderLight}`,
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "inline-block",
            marginBottom: "32px",
          }}
        >
          <QRCodeSVG value={menuUrl} size={220} level="H" includeMargin={false} />
        </div>

        <p style={{ fontSize: "0.72rem", color: theme.textSecondary, marginBottom: "32px", wordBreak: "break-all" }}>
          {menuUrl}
        </p>

        <button
          onClick={() => window.print()}
          style={{
            width: "100%",
            background: theme.primary,
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "13px",
            fontWeight: "bold",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Imprimer le QR code
        </button>
      </div>
    </div>
  );
}