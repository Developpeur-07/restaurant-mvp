import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/useTheme";
import { useSubscription } from "../hooks/useSubscription";
import { Sun, Moon, ArrowLeft, Mail, Lock, ChefHat, Bell, Copy, Check } from "lucide-react";

const STATUS_DISPLAY = {
  trial: { label: "Essai en cours", bg: "#DBEAFE", color: "#1E40AF" },
  active: { label: "Actif", bg: "#DCFCE7", color: "#166534" },
  grace_period: { label: "Grâce", bg: "#FFF9C4", color: "#7B6000" },
  suspended: { label: "Suspendu", bg: "#FEE2E2", color: "#991B1B" },
};

const STAFF_ROLES = [
  { value: "reception", label: "Réception", Icon: Bell },
  { value: "kitchen", label: "Cuisine", Icon: ChefHat },
];

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  // ── INVITATION STAFF — génération de lien scopé restaurant + rôle ──
  const [newStaffRole, setNewStaffRole] = useState("reception");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [staffTokens, setStaffTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

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

  // ── Liste des invitations staff déjà générées pour ce restaurant ──
  useEffect(() => {
    async function fetchStaffTokens() {
      if (!isOwner || !restaurantId) { setLoadingTokens(false); return; }
      const { data } = await supabase
        .from("staff_invitation_tokens")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      setStaffTokens(data || []);
      setLoadingTokens(false);
    }
    fetchStaffTokens();
  }, [isOwner, restaurantId]);

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

  async function handleProSubscription() {
    if (!isOwner || !restaurantId) {
      setMessage({
        type: "error",
        text: "Seul le propriétaire du restaurant peut souscrire.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId,
          plan: "pro",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.checkoutUrl) {
        throw new Error(
          data.error || "Impossible de créer la session de paiement."
        );
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Erreur paiement Pro:", error);

      setMessage({
        type: "error",
        text: error.message || "Une erreur est survenue.",
      });

      setLoading(false);
    }
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

  // ── Génère un lien d'invitation staff scopé restaurant_id + rôle choisi ──
  async function generateStaffToken() {
    if (!isOwner || !restaurantId) return;
    setGeneratingToken(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGeneratingToken(false);
      setMessage({ type: "error", text: "Session expirée, reconnecte-toi" });
      return;
    }

    const { data, error } = await supabase
      .from("staff_invitation_tokens")
      .insert({
        restaurant_id: restaurantId,
        role: newStaffRole,
        created_by: user.id,
      })
      .select()
      .single();

    setGeneratingToken(false);

    if (error) {
      setMessage({ type: "error", text: "Erreur lors de la génération : " + error.message });
      return;
    }

    setStaffTokens((prev) => [data, ...prev]);
    setMessage({ type: "success", text: "Lien d'invitation généré ✓" });
    setTimeout(() => setMessage(null), 3000);
  }

  function copyStaffLink(token, id) {
    const url = `${window.location.origin}/staff-onboarding/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
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
                onClick={handleProSubscription}
                disabled={loading}
                title="Souscrire au plan Pro — 35 000 XAF"
                style={{
                  width: "100%",
                  background: loading ? theme.borderLight : brand.primary_color,
                  color: loading ? theme.textSecondary : "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "13px",
                  fontWeight: "bold",
                  fontSize: "0.88rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s ease",
                }}
              >
                {loading ? "Préparation du paiement..." : "Réactiver — 35 000 XAF"}
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

        {/* INVITER DU STAFF — réservé au propriétaire, remplace l'ancien lien vers Supabase Dashboard */}
        {isOwner && (
          <div style={{ background: theme.cardBackground, borderRadius: "20px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 8px" }}>
              Inviter un membre de l'équipe
            </h2>

            {features.multiStaffAccounts ? (
              <>
                <p style={{ color: theme.textSecondary, fontSize: "0.75rem", margin: "0 0 16px" }}>
                  Choisis le rôle, génère le lien, partage-le — le compte staff est rattaché automatiquement à ce restaurant
                </p>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  {STAFF_ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setNewStaffRole(r.value)}
                      style={{
                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                        padding: "14px 10px", borderRadius: "14px", cursor: "pointer",
                        border: `2px solid ${newStaffRole === r.value ? theme.primary : theme.borderLight}`,
                        background: newStaffRole === r.value ? `${theme.primary}1A` : theme.pageBackground,
                      }}
                    >
                      <r.Icon size={20} color={newStaffRole === r.value ? theme.primary : theme.textSecondary} />
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: newStaffRole === r.value ? theme.primary : theme.textPrimary }}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={generateStaffToken}
                  disabled={generatingToken}
                  style={{ width: "100%", background: brand.secondary_color, color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold", fontSize: "0.88rem", cursor: "pointer", opacity: generatingToken ? 0.6 : 1, marginBottom: "20px" }}
                >
                  {generatingToken ? "Génération..." : "+ Générer le lien"}
                </button>

                {!loadingTokens && staffTokens.length > 0 && (
                  <>
                    <div style={{ height: "1px", background: theme.borderLight, margin: "0 0 16px" }} />
                    <p style={{ fontSize: "0.78rem", color: theme.textSecondary, margin: "0 0 12px", fontWeight: "600" }}>
                      Invitations ({staffTokens.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {staffTokens.map((t) => {
                        const isExpired = new Date(t.expires_at) < new Date();
                        const roleInfo = STAFF_ROLES.find((r) => r.value === t.role) || STAFF_ROLES[0];
                        return (
                          <div key={t.id} style={{
                            background: theme.pageBackground, borderRadius: "14px", padding: "14px 16px",
                            opacity: (t.used || isExpired) ? 0.65 : 1,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "8px" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: "600", color: theme.textPrimary }}>
                                <roleInfo.Icon size={14} /> {roleInfo.label}
                              </span>
                              <span style={{
                                fontSize: "0.68rem", fontWeight: "600", padding: "4px 10px", borderRadius: "14px",
                                background: t.used ? "#F3F4F6" : isExpired ? "#fee2e2" : "#DCFCE7",
                                color: t.used ? "#6B7280" : isExpired ? "#dc2626" : "#166534",
                              }}>
                                {t.used ? "Utilisé" : isExpired ? "Expiré" : "Actif"}
                              </span>
                            </div>
                            {!t.used && !isExpired && (
                              <button
                                onClick={() => copyStaffLink(t.token, t.id)}
                                style={{
                                  width: "100%", background: theme.cardBackground, border: `1px solid ${theme.borderLight}`,
                                  borderRadius: "10px", padding: "10px", color: theme.primary,
                                  fontSize: "0.76rem", fontWeight: "600", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                }}
                              >
                                {copiedTokenId === t.id ? <><Check size={13} /> Copié !</> : <><Copy size={13} /> Copier le lien</>}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
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