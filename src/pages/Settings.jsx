import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/useTheme";
import { useSubscription } from "../hooks/useSubscription";
import { Sun, Moon, ArrowLeft, Mail, Lock } from "lucide-react";

const STATUS_DISPLAY = {
  trial: { label: "Essai en cours", bg: "#DBEAFE", color: "#1E40AF" },
  active: { label: "Actif", bg: "#DCFCE7", color: "#166534" },
  grace_period: { label: "Grâce", bg: "#FFF9C4", color: "#7B6000" },
  suspended: { label: "Suspendu", bg: "#FEE2E2", color: "#991B1B" },
};

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [brand, setBrand] = useState({
    name: "",
    primary_color: "#1F2A44",
    secondary_color: "#C9A84C",
    slogan: "",
    address: "",
    logo_url: "",
  });
  const [brandLoading, setBrandLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { theme, darkMode, toggleDarkMode } = useTheme(brand.primary_color);

  // ── ABONNEMENT — restaurantId résout owner OU reception (SubscriptionProvider) ──
  const { subscriptionStatus, plan, trialEndAt, nextBillingDate, features, restaurantId, isOwner } = useSubscription();

  const trialDaysLeft = trialEndAt
    ? Math.ceil((new Date(trialEndAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const statusDisplay = STATUS_DISPLAY[subscriptionStatus];

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      if (!restaurantId) return;

      const { data: resto } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();

      if (resto) {
        setBrand({
          name: resto.name || "",
          primary_color: resto.primary_color || "#1F2A44",
          secondary_color: resto.secondary_color || "#C9A84C",
          slogan: resto.slogan || "",
          address: resto.address || "",
          logo_url: resto.logo_url || "",
        });
      }
    }
    init();
  }, [restaurantId]);

  async function handleLogoUpload(e) {
    if (!isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Le fichier doit être une image" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image trop lourde (max 2 Mo)" });
      return;
    }

    setUploadingLogo(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadingLogo(false);
      setMessage({ type: "error", text: "Session expirée, reconnecte-toi" });
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (upErr) {
      setUploadingLogo(false);
      setMessage({ type: "error", text: "Échec upload : " + upErr.message });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);

    setBrand((prev) => ({ ...prev, logo_url: publicUrl }));
    setUploadingLogo(false);
    setMessage({ type: "success", text: "Logo uploadé ✓ — pense à sauvegarder" });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleBrandSave() {
    if (!isOwner) return;
    setBrandLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBrandLoading(false);
      setMessage({ type: "error", text: "Session expirée, reconnecte-toi" });
      return;
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: brand.name,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
        slogan: brand.slogan,
        address: brand.address,
        logo_url: brand.logo_url,
      })
      .eq("owner_id", user.id);

    setBrandLoading(false);
    setMessage({
      type: error ? "error" : "success",
      text: error ? "Erreur lors de la sauvegarde" : "Identité mise à jour ✓",
    });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handlePasswordChange() {
    if (!currentPassword) {
      setMessage({ type: "error", text: "Entrez votre mot de passe actuel" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Minimum 6 caractères" });
      return;
    }

    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });

    if (reAuthError) {
      setMessage({ type: "error", text: "Mot de passe actuel incorrect" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: "Erreur lors du changement" });
      return;
    }
    setMessage({ type: "success", text: "Mot de passe mis à jour ✓" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleAddAdmin() {
    if (!isOwner) return;
    if (!newAdminEmail) return;
    window.open(
      "https://supabase.com/dashboard/project/vtgflrwctsqgntmuguvf/auth/users",
      "_blank",
    );
    setMessage({
      type: "success",
      text: `Ouvre le lien → Invite User → entre ${newAdminEmail}`,
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div style={{ background: theme.pageBackground, minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${brand.primary_color}CC, ${brand.primary_color})`, padding: "32px 20px 28px" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "10px",
                padding: "9px 14px", color: "#fff", cursor: "pointer", fontSize: "0.85rem",
                display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              <ArrowLeft size={15} /> Retour
            </button>
            <div>
              <p style={{ color: brand.secondary_color, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, fontFamily: "Georgia, serif" }}>
                Administration
              </p>
              <h1 style={{ color: "#fff", fontSize: "1.4rem", fontFamily: "Georgia, serif", margin: 0 }}>
                Paramètres
              </h1>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "10px",
              padding: "9px 11px", cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center", color: "inherit",
            }}
          >
            {darkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "28px 18px" }}>

        {message && (
          <div style={{
            background: message.type === "success" ? "#f0fff0" : "#fff0f0",
            border: `1px solid ${message.type === "success" ? "#90EE90" : "#ffcccc"}`,
            borderRadius: "14px", padding: "14px 18px", marginBottom: "24px"
          }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: message.type === "success" ? "#2d6b2d" : "#cc0000" }}>
              {message.text}
            </p>
          </div>
        )}

        {/* COMPTE ACTUEL */}
        <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 14px" }}>
            Compte actuel
          </h2>
          <p style={{ color: theme.textPrimary, fontSize: "0.85rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Mail size={15} /> {user?.email}
          </p>
        </div>

        {/* ABONNEMENT — visible pour tous (lecture seule) */}
        <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: 0 }}>
              Abonnement
            </h2>
            {statusDisplay && (
              <span style={{
                background: statusDisplay.bg, color: statusDisplay.color,
                fontSize: "0.72rem", fontWeight: "600", padding: "5px 12px", borderRadius: "20px",
              }}>
                {statusDisplay.label}
              </span>
            )}
          </div>

          <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: "0 0 6px" }}>
            Plan : <strong style={{ color: theme.textPrimary }}>{plan === "pro" ? "Pro" : "Free"}</strong>
          </p>

          {subscriptionStatus === "trial" && trialDaysLeft !== null && (
            <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: "0 0 6px" }}>
              Essai : <strong style={{ color: theme.textPrimary }}>{trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}</strong>
            </p>
          )}

          {subscriptionStatus === "active" && nextBillingDate && (
            <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: "0 0 6px" }}>
              Prochaine échéance : <strong style={{ color: theme.textPrimary }}>
                {new Date(nextBillingDate).toLocaleDateString("fr-FR")}
              </strong>
            </p>
          )}

          {subscriptionStatus === "suspended" && isOwner && (
            <>
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", lineHeight: 1.5, margin: "8px 0 16px" }}>
                Vos commandes en cours continuent normalement. Réactivez pour retrouver stats, branding et Realtime.
              </p>
              <button
                disabled
                title="Le paiement en ligne arrive bientôt"
                style={{
                  width: "100%", background: theme.borderLight, color: theme.textSecondary,
                  border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold",
                  fontSize: "0.88rem", cursor: "not-allowed",
                }}
              >
                Réactiver — bientôt disponible
              </button>
            </>
          )}
        </div>

        {/* IDENTITÉ VISUELLE — réservé au propriétaire */}
        {isOwner && (
          <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 18px" }}>
              Identité visuelle
            </h2>

            <div style={{ background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color}CC)`, borderRadius: "16px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
              {brand.logo_url && (
                <img src={brand.logo_url} alt="logo" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px" }} />
              )}
              <p style={{ color: brand.secondary_color, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                {brand.slogan || "Votre slogan ici"}
              </p>
              <p style={{ color: "#fff", fontSize: "1.3rem", fontFamily: "Georgia, serif", fontWeight: "bold", margin: "0 0 6px" }}>
                {brand.name || "Nom du restaurant"}
              </p>
              <div style={{ width: "30px", height: "2px", background: brand.secondary_color, margin: "8px auto" }} />
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", margin: 0 }}>
                {brand.address || "Votre adresse"}
              </p>
            </div>

            {[
              { label: "Nom du restaurant", key: "name", type: "text", placeholder: "Ex: Le Bourgeois" },
              { label: "Slogan", key: "slogan", type: "text", placeholder: "Ex: Le Goût Du Bon Gâteau" },
              { label: "Adresse", key: "address", type: "text", placeholder: "Ex: Marché Moungali, Brazzaville" },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: theme.textSecondary, marginBottom: "8px", fontWeight: "600" }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={brand[field.key] || ""}
                  onChange={(e) => setBrand((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  style={{
                    width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px",
                    padding: "11px 15px", fontSize: "0.88rem", background: theme.pageBackground,
                    color: theme.textPrimary, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: theme.textSecondary, marginBottom: "8px", fontWeight: "600" }}>
                Logo
              </label>

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                style={{
                  width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px",
                  padding: "11px 15px", fontSize: "0.82rem", background: theme.pageBackground,
                  color: theme.textPrimary, outline: "none", boxSizing: "border-box",
                  cursor: uploadingLogo ? "not-allowed" : "pointer", opacity: uploadingLogo ? 0.6 : 1
                }}
              />
              {uploadingLogo && (
                <p style={{ fontSize: "0.75rem", color: theme.primary, margin: "8px 0 0" }}>
                  Upload en cours...
                </p>
              )}

              <input
                type="text"
                placeholder="ou colle une URL https://..."
                value={brand.logo_url || ""}
                onChange={(e) => setBrand((prev) => ({ ...prev, logo_url: e.target.value }))}
                style={{
                  width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px",
                  padding: "11px 15px", fontSize: "0.88rem", background: theme.pageBackground,
                  color: theme.textPrimary, outline: "none", boxSizing: "border-box", marginTop: "10px"
                }}
              />

              {brand.logo_url && (
                <div style={{ marginTop: "14px", display: "flex", justifyContent: "center" }}>
                  <img src={brand.logo_url} alt="Logo" style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.borderLight}` }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              {[
                { label: "Couleur principale", key: "primary_color" },
                { label: "Couleur accent", key: "secondary_color" },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: theme.textSecondary, marginBottom: "8px", fontWeight: "600" }}>
                    {field.label}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="color"
                      value={brand[field.key] || theme.primary}
                      onChange={(e) => setBrand((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ width: "44px", height: "44px", borderRadius: "10px", border: `2px solid ${theme.borderLight}`, cursor: "pointer", padding: "2px", flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={brand[field.key]}
                      onChange={(e) => setBrand((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      style={{
                        flex: 1, border: `2px solid ${theme.borderLight}`, borderRadius: "10px",
                        padding: "11px", fontSize: "0.82rem", background: theme.pageBackground,
                        color: theme.textPrimary, outline: "none", minWidth: 0
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleBrandSave}
              disabled={brandLoading || uploadingLogo}
              style={{ width: "100%", background: theme.primary, color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold", fontSize: "0.88rem", cursor: "pointer", opacity: brandLoading || uploadingLogo ? 0.6 : 1 }}
            >
              {brandLoading ? "Sauvegarde..." : "Sauvegarder l'identité"}
            </button>
          </div>
        )}

        {/* CHANGER MOT DE PASSE — dispo pour tout compte (propriétaire ou staff) */}
        <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 18px" }}>
            Changer le mot de passe
          </h2>

          <input
            type="password" placeholder="Mot de passe actuel" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.88rem", marginBottom: "12px", outline: "none", boxSizing: "border-box", background: theme.pageBackground, color: theme.textPrimary }}
          />
          <input
            type="password" placeholder="Nouveau mot de passe" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.88rem", marginBottom: "12px", outline: "none", boxSizing: "border-box", background: theme.pageBackground, color: theme.textPrimary }}
          />
          <input
            type="password" placeholder="Confirmer le mot de passe" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.88rem", marginBottom: "16px", outline: "none", boxSizing: "border-box", background: theme.pageBackground, color: theme.textPrimary }}
          />
          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={!currentPassword || !newPassword || !confirmPassword || loading}
            style={{
              width: "100%", background: theme.primary, color: "#fff", border: "none",
              borderRadius: "12px", padding: "13px", fontWeight: "bold", fontSize: "0.88rem",
              cursor: "pointer", opacity: !currentPassword || !newPassword || !confirmPassword || loading ? 0.6 : 1
            }}
          >
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </button>
        </div>

        {/* AJOUTER UN ADMIN — réservé au propriétaire */}
        {isOwner && (
          <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 8px" }}>
              Ajouter un administrateur
            </h2>

            {features.multiStaffAccounts ? (
              <>
                <p style={{ color: theme.textSecondary, fontSize: "0.75rem", margin: "0 0 16px" }}>
                  Un email d'invitation sera envoyé automatiquement
                </p>
                <input
                  type="email" placeholder="email@restaurant.com" value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  style={{ width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px", padding: "12px 15px", fontSize: "0.88rem", marginBottom: "14px", outline: "none", boxSizing: "border-box", background: theme.pageBackground, color: theme.textPrimary }}
                />
                <button
                  onClick={handleAddAdmin}
                  disabled={!newAdminEmail}
                  style={{ width: "100%", background: brand.secondary_color, color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold", fontSize: "0.88rem", cursor: "pointer", opacity: !newAdminEmail ? 0.6 : 1 }}
                >
                  Ouvrir le panneau d'invitation →
                </button>
              </>
            ) : (
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Lock size={14} /> Les comptes staff multiples sont disponibles avec un abonnement actif
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{ width: "100%", background: "transparent", border: `2px solid ${theme.borderLight}`, borderRadius: "14px", padding: "14px", color: theme.textSecondary, fontWeight: "600", fontSize: "0.88rem", cursor: "pointer" }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}