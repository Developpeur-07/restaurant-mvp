import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/useTheme";
import { useSubscription } from "../hooks/useSubscription";
import {
  Sun, Moon, ArrowLeft, Mail, Lock, ChefHat, Bell, Copy, Check,
  ShieldCheck, ShieldOff, Smartphone, KeyRound, RefreshCw, Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest } from "../lib/api";

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

// Feuille de style partagée des pages d'administration.
//
// Pourquoi des classes plutôt que des styles en ligne : un style en ligne ne
// peut pas réagir à la largeur de l'écran. C'est la cause exacte de l'absence
// de responsive sur cette page, qui restait une colonne de 480px sur un écran
// large. Les couleurs viennent de variables posées une seule fois sur la page,
// donc le thème (et le mode sombre) continuent de s'appliquer.
//
// Préfixe adm- : exclut toute collision avec un utilitaire Tailwind (les cartes
// de la page d'accueil étaient tombées à 12px à cause de w-3 / w-2).
const ADMIN_CSS = `
.adm-page{min-height:100vh;background:var(--adm-page)}

.adm-header-inner{
  max-width:520px;margin:0 auto;display:flex;justify-content:space-between;
  align-items:center;gap:12px;flex-wrap:wrap;
}

/* Le conteneur EST la grille : pas de div supplémentaire à insérer, donc pas
   de réindentation de 700 lignes. Les éléments .adm-full occupent toute la
   largeur ; les cartes se répartissent seules. */
.adm-wrap{
  max-width:520px;margin:0 auto;padding:24px 16px 48px;
  display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start;
}
.adm-full{grid-column:1/-1}

.adm-card{
  background:var(--adm-card);border-radius:20px;padding:20px;
  box-shadow:0 2px 8px rgba(0,0,0,0.08);
  /* Sans min-width:0, un contenu long (adresse e-mail, jeton d'invitation)
     étire la piste de la grille et provoque un défilement horizontal. */
  min-width:0;
}
.adm-label{
  display:block;font-size:.78rem;color:var(--adm-text-2);
  margin-bottom:8px;font-weight:600;
}
.adm-input{
  width:100%;box-sizing:border-box;font-family:inherit;
  border:2px solid var(--adm-border);border-radius:12px;padding:12px 15px;
  font-size:.88rem;margin-bottom:12px;outline:none;
  background:var(--adm-page);color:var(--adm-text);
}

/* Un mot plus long que sa carte doit se couper plutôt que déborder. */
.adm-card p,.adm-card h2,.adm-card strong,.adm-card span,.adm-card code{
  overflow-wrap:break-word;
}

@media (min-width:700px){
  .adm-wrap{
    max-width:1120px;padding:32px 24px 56px;
    grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;
  }
  .adm-header-inner{max-width:1120px}
  .adm-card{padding:24px}
}
`;

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

  // ── SÉCURITÉ — double authentification (TOTP) ──
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaFactor, setMfaFactor] = useState(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [enrollData, setEnrollData] = useState(null);   // { factorId, secret, uri }
  const [totpCode, setTotpCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);      // affichés UNE seule fois
  const [recoveryStatus, setRecoveryStatus] = useState(null);  // { total, remaining }
  const [copiedSecret, setCopiedSecret] = useState(false);

  // ── ÉQUIPE — réinitialisation des mots de passe cuisine / réception ──
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const { theme, darkMode, toggleDarkMode } = useTheme(brand.primary_color);

  // ── ABONNEMENT — restaurantId résout owner OU reception (SubscriptionProvider) ──
  const { subscriptionStatus, plan, trialEndAt, nextBillingDate, features, restaurantId, isOwner, refreshSubscription } = useSubscription();

  const trialDaysLeft = trialEndAt
    ? Math.ceil((new Date(trialEndAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const statusDisplay = STATUS_DISPLAY[subscriptionStatus];

  // ── GESTION RETOUR PAIEMENT YABETOO (?payment=success / ?payment=cancelled) ──
  const verifyAndActivate = useCallback(async (isRedirect = false) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("sessionId");

      const res = await fetch("/api/verify-subscription-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          restaurantId,
          ...(sessionId ? { sessionId } : {}),
          ...(isRedirect ? { isSuccessRedirect: true } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: "Votre abonnement PRO a bien été activé ! Merci pour votre confiance.",
        });
      } else if (data.message) {
        setMessage({
          type: "error",
          text: data.message,
        });
      }
    } catch (err) {
      console.error("Erreur vérification abonnement:", err);
    } finally {
      if (typeof refreshSubscription === "function") {
        await refreshSubscription();
      }
      setLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshSubscription, restaurantId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");

    if (paymentResult === "success") {
      setMessage({
        type: "success",
        text: "Paiement effectué avec succès ! Vérification et activation de votre abonnement PRO en cours...",
      });
      verifyAndActivate(true);
    } else if (paymentResult === "cancelled") {
      setTimeout(() => {
        setMessage({
          type: "error",
          text: "Le paiement a été annulé. Aucun montant n'a été débité.",
        });
      }, 0);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [verifyAndActivate]);

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
      // Récupérer la session Supabase actuelle
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          restaurantId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.checkoutUrl) {
        throw new Error(
          data.error || "Impossible de créer la session de paiement."
        );
      }

      // Redirection vers Yabetoo (avec fallback de domaine pay.yabetoo.com)
      const sanitizedUrl = data.checkoutUrl.replace("pay.yabetoopay.com", "pay.yabetoo.com");
      window.location.href = sanitizedUrl;
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

  // ══════════════════════════════════════════════════════════════════════════
  // SÉCURITÉ — DOUBLE AUTHENTIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  function friendlyMfaError(error) {
    switch (error?.code) {
      case "mfa_verification_rejected":
        return "Trop d'essais infructueux. Patiente quelques minutes.";
      case "mfa_verification_failed":
        return "Code incorrect. Vérifie l'heure de ton téléphone puis réessaie.";
      case "mfa_factor_not_found":
        return "Facteur introuvable, reconnecte-toi.";
      default:
        return error?.message || "Opération impossible.";
    }
  }

  const loadSecurity = useCallback(async () => {
    setMfaLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = (factors?.totp || []).find((f) => f.status === "verified") || null;
      setMfaFactor(verified);

      if (verified) {
        try {
          const status = await apiRequest("/api/admin/security/recovery-codes");
          setRecoveryStatus(status);
        } catch {
          setRecoveryStatus(null); // backend non configuré : on n'affiche pas le compteur
        }
      } else {
        setRecoveryStatus(null);
      }
    } catch (error) {
      console.error("Settings: lecture facteurs MFA", error);
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    // Lecture asynchrone des facteurs MFA : le setState intervient au retour
    // réseau, pas dans le corps synchrone de l'effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSecurity();
  }, [loadSecurity]);

  /** Étape 1 — crée le secret TOTP et affiche le QR code à scanner. */
  async function startEnrollment() {
    setMfaBusy(true);
    setMessage(null);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Espace administration",
    });
    setMfaBusy(false);

    if (error) {
      setMessage({ type: "error", text: friendlyMfaError(error) });
      return;
    }

    setEnrollData({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri });
    setTotpCode("");
  }

  /** Étape 2 — valide le premier code : le facteur passe à "verified". */
  async function confirmEnrollment(event) {
    event.preventDefault();
    if (mfaBusy) return;
    const cleaned = totpCode.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setMessage({ type: "error", text: "Le code contient 6 chiffres." });
      return;
    }

    setMfaBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.factorId,
      code: cleaned,
    });

    if (error) {
      setMfaBusy(false);
      setMessage({ type: "error", text: friendlyMfaError(error) });
      return;
    }

    // La session est passée en aal2 : on peut générer les codes de secours.
    try {
      const { codes } = await apiRequest("/api/admin/security/recovery-codes", {
        method: "POST",
        body: { action: "generate" },
      });
      setRecoveryCodes(codes || []);
    } catch (requestError) {
      console.error("Settings: génération codes de secours", requestError);
      setMessage({
        type: "success",
        text: "2FA activée ✓ (codes de secours indisponibles : backend non configuré)",
      });
    }

    setEnrollData(null);
    setTotpCode("");
    setMfaBusy(false);
    setMessage({ type: "success", text: "Double authentification activée ✓" });
    await loadSecurity();
  }

  /** Désactivation : exige un code valide (et la session aal2 si besoin). */
  async function disableMfa(event) {
    event.preventDefault();
    if (mfaBusy || !mfaFactor) return;
    const cleaned = disableCode.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setMessage({ type: "error", text: "Le code contient 6 chiffres." });
      return;
    }

    setMfaBusy(true);
    try {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance && assurance.currentLevel !== "aal2") {
        const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
          factorId: mfaFactor.id,
          code: cleaned,
        });
        if (verifyError) throw verifyError;
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id });
      if (error) throw error;

      try {
        await apiRequest("/api/admin/security/recovery-codes", {
          method: "POST",
          body: { action: "clear" },
        });
      } catch {
        /* les codes sont inutiles sans 2FA, on ne bloque pas là-dessus */
      }

      setRecoveryCodes([]);
      setRecoveryStatus(null);
      setShowDisable(false);
      setDisableCode("");
      setMessage({ type: "success", text: "Double authentification désactivée." });
      await loadSecurity();
    } catch (error) {
      setMessage({ type: "error", text: friendlyMfaError(error) });
    } finally {
      setMfaBusy(false);
    }
  }

  /** Nouvelle série de codes de secours (les anciens sont invalidés). */
  async function regenerateRecoveryCodes() {
    setMfaBusy(true);
    setMessage(null);
    try {
      const { codes } = await apiRequest("/api/admin/security/recovery-codes", {
        method: "POST",
        body: { action: "regenerate" },
      });
      setRecoveryCodes(codes || []);
      setMessage({ type: "success", text: "Nouvelle série de codes générée ✓" });
      await loadSecurity();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message || "Génération impossible." });
    } finally {
      setMfaBusy(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(enrollData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉQUIPE — RÉINITIALISATION DES MOTS DE PASSE
  // ══════════════════════════════════════════════════════════════════════════

  const loadTeam = useCallback(async () => {
    if (!isOwner || !restaurantId) return;
    setTeamLoading(true);
    setTeamError("");
    try {
      const { members } = await apiRequest("/api/admin/staff");
      setTeam(members || []);
    } catch (requestError) {
      setTeam([]);
      setTeamError(requestError.message || "Chargement de l'équipe impossible.");
    } finally {
      setTeamLoading(false);
    }
  }, [isOwner, restaurantId]);

  useEffect(() => {
    // Chargement asynchrone de l'équipe via l'API serveur (idem ci-dessus).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeam();
  }, [loadTeam]);

  function generateStrongPassword() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const byte of bytes) out += alphabet[byte % alphabet.length];
    setResetPassword(out);
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    if (!resetTarget || resetBusy) return;
    if (resetPassword.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }

    setResetBusy(true);
    setMessage(null);
    try {
      const result = await apiRequest("/api/admin/staff", {
        method: "POST",
        body: { staffUserId: resetTarget.user_id, newPassword: resetPassword },
      });
      setMessage({
        type: "success",
        text: result.message || "Mot de passe réinitialisé ✓",
      });
      setResetTarget(null);
      setResetPassword("");
      await loadTeam();
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message || "Réinitialisation impossible." });
    } finally {
      setResetBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div
      className="adm-page"
      style={{
        "--adm-page": theme.pageBackground,
        "--adm-card": theme.cardBackground,
        "--adm-text": theme.textPrimary,
        "--adm-text-2": theme.textSecondary,
        "--adm-muted": theme.textMuted,
        "--adm-border": theme.borderLight,
      }}
    >

      <style>{ADMIN_CSS}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${brand.primary_color}CC, ${brand.primary_color})`, padding: "32px 20px 28px" }}>
        <div className="adm-header-inner">
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

      <div className="adm-wrap">

        {message && (
          <div className="adm-full" style={{
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
        <div className="adm-card">
          <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 14px" }}>
            Compte actuel
          </h2>
          <p style={{ color: theme.textPrimary, fontSize: "0.85rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Mail size={15} /> {user?.email}
          </p>
        </div>

        {/* ABONNEMENT — visible pour tous (lecture seule) */}
        <div className="adm-card">
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
          <div className="adm-card">
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
                <label className="adm-label">
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
              <label className="adm-label">
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
                  <label className="adm-label">
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
        <div className="adm-card">
          <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 18px" }}>
            Changer le mot de passe
          </h2>

          <input
            type="password" placeholder="Mot de passe actuel" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="adm-input"
          />
          <input
            type="password" placeholder="Nouveau mot de passe" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="adm-input"
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

        {/* SÉCURITÉ — DOUBLE AUTHENTIFICATION (2FA) */}
        <div className="adm-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={17} /> Double authentification
            </h2>
            {!mfaLoading && (
              <span style={{
                background: mfaFactor ? "#DCFCE7" : "#FEE2E2",
                color: mfaFactor ? "#166534" : "#991B1B",
                fontSize: "0.68rem", fontWeight: "600", padding: "5px 11px",
                borderRadius: "20px", whiteSpace: "nowrap",
              }}>
                {mfaFactor ? "Activée" : "Désactivée"}
              </span>
            )}
          </div>

          {mfaLoading ? (
            <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: 0 }}>Chargement...</p>
          ) : enrollData ? (
            /* ── ÉTAPE : scan du QR code ── */
            <>
              <p style={{ color: theme.textSecondary, fontSize: "0.8rem", margin: "0 0 4px", lineHeight: 1.5 }}>
                Scanne ce QR code avec <strong>Google Authenticator</strong>, Authy ou Microsoft Authenticator.
              </p>
              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 14px" }}>
                <div style={{ background: "#fff", padding: "12px", borderRadius: "14px", border: `1px solid ${theme.borderLight}` }}>
                  <QRCodeSVG value={enrollData.uri} size={158} level="M" bgColor="#ffffff" fgColor="#000000" />
                </div>
              </div>
              <p style={{ color: theme.textSecondary, fontSize: "0.75rem", margin: "0 0 8px" }}>
                Impossible de scanner ? Saisis cette clé à la main dans l'application :
              </p>
              <button
                type="button"
                onClick={copySecret}
                style={{
                  width: "100%", background: theme.pageBackground, border: `1px dashed ${theme.borderLight}`,
                  borderRadius: "10px", padding: "11px", color: theme.primary, fontFamily: "monospace",
                  fontSize: "0.76rem", cursor: "pointer", wordBreak: "break-all", marginBottom: "18px",
                }}
              >
                {copiedSecret ? "Clé copiée ✓" : enrollData.secret}
              </button>

              <form onSubmit={confirmEnrollment}>
                <label className="adm-label">
                  Code à 6 chiffres affiché dans l'application
                </label>
                <input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000 000"
                  style={{
                    width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px",
                    padding: "13px", fontSize: "1.3rem", letterSpacing: "0.35em", textAlign: "center",
                    fontFamily: "monospace", background: theme.pageBackground,
                    color: theme.textPrimary, outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={mfaBusy || totpCode.length !== 6}
                  style={{
                    width: "100%", marginTop: "14px", background: theme.primary, color: "#fff",
                    border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold",
                    fontSize: "0.88rem", cursor: "pointer",
                    opacity: mfaBusy || totpCode.length !== 6 ? 0.6 : 1,
                  }}
                >
                  {mfaBusy ? "Vérification..." : "Activer la 2FA"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // On nettoie le facteur non vérifié pour ne pas encombrer
                    // le compte (Supabase plafonne à 10 facteurs).
                    try { await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId }); } catch { /* facteur déjà nettoyé */ }
                    setEnrollData(null);
                    setTotpCode("");
                  }}
                  style={{ width: "100%", marginTop: "10px", background: "none", border: "none", color: theme.textSecondary, fontSize: "0.8rem", cursor: "pointer" }}
                >
                  Annuler
                </button>
              </form>
            </>
          ) : mfaFactor ? (
            /* ── 2FA DÉJÀ ACTIVÉE ── */
            <>
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={14} /> {mfaFactor.friendly_name || "Application d'authentification"}
              </p>
              <p style={{ color: theme.textSecondary, fontSize: "0.78rem", margin: "0 0 14px", lineHeight: 1.55 }}>
                Un code à 6 chiffres est demandé à chaque nouvelle connexion à ton espace administration.
              </p>

              {recoveryStatus && (
                <div style={{
                  background: theme.pageBackground, borderRadius: "12px", padding: "12px 14px",
                  marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px",
                }}>
                  <span style={{ fontSize: "0.78rem", color: theme.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                    <KeyRound size={14} /> Codes de secours restants
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: "700", color: recoveryStatus.remaining === 0 ? "#dc2626" : theme.primary }}>
                    {recoveryStatus.remaining} / {recoveryStatus.total}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={regenerateRecoveryCodes}
                disabled={mfaBusy}
                style={{
                  width: "100%", background: theme.pageBackground, border: `1px solid ${theme.borderLight}`,
                  borderRadius: "12px", padding: "12px", color: theme.primary, fontWeight: "600",
                  fontSize: "0.84rem", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "8px", marginBottom: "10px",
                  opacity: mfaBusy ? 0.6 : 1,
                }}
              >
                <RefreshCw size={14} /> {recoveryStatus ? "Régénérer les codes" : "Créer des codes de secours"}
              </button>

              {!showDisable ? (
                <button
                  type="button"
                  onClick={() => setShowDisable(true)}
                  style={{ width: "100%", background: "none", border: "none", color: theme.textSecondary, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <ShieldOff size={14} /> Désactiver la double authentification
                </button>
              ) : (
                <form onSubmit={disableMfa} style={{ marginTop: "6px" }}>
                  <input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Code à 6 chiffres"
                    style={{
                      width: "100%", border: `2px solid ${theme.borderLight}`, borderRadius: "12px",
                      padding: "12px", fontSize: "1.1rem", letterSpacing: "0.3em", textAlign: "center",
                      fontFamily: "monospace", background: theme.pageBackground,
                      color: theme.textPrimary, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={mfaBusy || disableCode.length !== 6}
                    style={{
                      width: "100%", marginTop: "10px", background: "#dc2626", color: "#fff",
                      border: "none", borderRadius: "12px", padding: "13px", fontWeight: "bold",
                      fontSize: "0.86rem", cursor: "pointer", opacity: mfaBusy || disableCode.length !== 6 ? 0.6 : 1,
                    }}
                  >
                    {mfaBusy ? "Vérification..." : "Confirmer la désactivation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDisable(false); setDisableCode("") }}
                    style={{ width: "100%", marginTop: "8px", background: "none", border: "none", color: theme.textSecondary, fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                </form>
              )}
            </>
          ) : (
            /* ── 2FA NON ACTIVÉE ── */
            <>
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: "0 0 16px", lineHeight: 1.55 }}>
                Ajoute une seconde barrière : même si ton mot de passe fuit, personne ne peut
                entrer sans le code temporaire de ton téléphone.
              </p>
              <button
                type="button"
                onClick={startEnrollment}
                disabled={mfaBusy}
                style={{
                  width: "100%", background: theme.primary, color: "#fff", border: "none",
                  borderRadius: "12px", padding: "13px", fontWeight: "bold", fontSize: "0.88rem",
                  cursor: "pointer", opacity: mfaBusy ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                <ShieldCheck size={16} /> {mfaBusy ? "Préparation..." : "Activer la double authentification"}
              </button>
              <p style={{ color: theme.textSecondary, fontSize: "0.72rem", margin: "12px 0 0", lineHeight: 1.5 }}>
                Compatible Google Authenticator, Authy et Microsoft Authenticator — sans SMS ni
                WhatsApp, ces canaux passent par un prestataire payant (Twilio / Meta Cloud API).
                On peut les brancher plus tard si tu veux ce canal en plus.
              </p>
            </>
          )}

          {/* CODES DE SECOURS — affichés une seule fois après génération */}
          {recoveryCodes.length > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "14px", padding: "16px", marginTop: "18px" }}>
              <p style={{ color: "#92400E", fontSize: "0.82rem", fontWeight: "700", margin: "0 0 6px" }}>
                Conserve tes codes de secours
              </p>
              <p style={{ color: "#92400E", fontSize: "0.74rem", margin: "0 0 12px", lineHeight: 1.5 }}>
                Chaque code ne fonctionne qu'une seule fois. Ils te permettront d'entrer si tu
                perds ton téléphone. <strong>Ils ne seront plus jamais réaffichés.</strong>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "14px" }}>
                {recoveryCodes.map((recoveryCode) => (
                  <code key={recoveryCode} style={{
                    background: "#fff", border: "1px solid #FDE68A", borderRadius: "8px",
                    padding: "7px 8px", fontSize: "0.7rem", textAlign: "center", color: "#92400E",
                    fontFamily: "monospace",
                  }}>
                    {recoveryCode}
                  </code>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join("\n"));
                    setMessage({ type: "success", text: "Codes copiés ✓" });
                  }}
                  style={{ flex: 1, background: "#fff", border: "1px solid #FDE68A", borderRadius: "10px", padding: "11px", color: "#92400E", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                >
                  Copier
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryCodes([])}
                  style={{ flex: 1, background: "#92400E", border: "none", borderRadius: "10px", padding: "11px", color: "#fff", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                >
                  J'ai enregistré mes codes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INVITER DU STAFF — réservé au propriétaire, remplace l'ancien lien vers Supabase Dashboard */}
        {isOwner && (
          <div className="adm-card">
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

        {/* MOTS DE PASSE DE L'ÉQUIPE — réservé au propriétaire */}
        {isOwner && (
          <div className="adm-card">
            <h2 style={{ color: theme.textPrimary, fontFamily: "Georgia, serif", fontSize: "1rem", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={17} /> Mots de passe de l'équipe
            </h2>
            <p style={{ color: theme.textSecondary, fontSize: "0.78rem", margin: "0 0 18px", lineHeight: 1.5 }}>
              Si la cuisine ou la réception oublie son mot de passe, fixe-en un nouveau ici —
              sans attendre d'email et sans les déconnecter de leurs appareils.
            </p>

            {teamError && (
              <p style={{ color: "#cc0000", fontSize: "0.78rem", margin: "0 0 14px", lineHeight: 1.5 }}>
                {teamError}
              </p>
            )}

            {teamLoading ? (
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: 0 }}>Chargement...</p>
            ) : team.length === 0 && !teamError ? (
              <p style={{ color: theme.textSecondary, fontSize: "0.82rem", margin: 0 }}>
                Aucun compte cuisine ou réception rattaché pour l'instant.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {team.map((member) => {
                  const roleInfo = STAFF_ROLES.find((r) => r.value === member.role) || STAFF_ROLES[0];
                  const isTarget = resetTarget?.user_id === member.user_id;

                  return (
                    <div
                      key={member.id}
                      style={{ background: theme.pageBackground, borderRadius: "14px", padding: "14px 16px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {member.email || "Email indisponible"}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: theme.textSecondary, display: "flex", alignItems: "center", gap: "5px" }}>
                            <roleInfo.Icon size={12} /> {roleInfo.label}
                            {member.last_sign_in_at
                              ? ` · vu le ${new Date(member.last_sign_in_at).toLocaleDateString("fr-FR")}`
                              : " · jamais connecté"}
                          </p>
                        </div>

                        {!isTarget && (
                          <button
                            type="button"
                            onClick={() => { setResetTarget(member); setResetPassword(""); setMessage(null); }}
                            style={{
                              background: theme.cardBackground, border: `1px solid ${theme.borderLight}`,
                              borderRadius: "10px", padding: "9px 13px", color: theme.primary,
                              fontSize: "0.76rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
                              display: "flex", alignItems: "center", gap: "6px",
                            }}
                          >
                            <KeyRound size={13} /> Réinitialiser
                          </button>
                        )}
                      </div>

                      {isTarget && (
                        <form onSubmit={submitPasswordReset} style={{ marginTop: "14px" }}>
                          <label style={{ display: "block", fontSize: "0.74rem", color: theme.textSecondary, marginBottom: "7px", fontWeight: "600" }}>
                            Nouveau mot de passe (8 caractères minimum)
                          </label>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                            <input
                              type="text"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              placeholder="Nouveau mot de passe"
                              style={{
                                flex: 1, minWidth: 0, border: `2px solid ${theme.borderLight}`,
                                borderRadius: "10px", padding: "11px 12px", fontSize: "0.85rem",
                                background: theme.cardBackground, color: theme.textPrimary,
                                outline: "none", boxSizing: "border-box", fontFamily: "monospace",
                              }}
                            />
                            <button
                              type="button"
                              onClick={generateStrongPassword}
                              style={{
                                background: theme.cardBackground, border: `1px solid ${theme.borderLight}`,
                                borderRadius: "10px", padding: "0 13px", color: theme.primary,
                                fontSize: "0.76rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
                              }}
                            >
                              Générer
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => { setResetTarget(null); setResetPassword(""); }}
                              style={{
                                flex: 1, background: "transparent", border: `2px solid ${theme.borderLight}`,
                                borderRadius: "10px", padding: "11px", color: theme.textSecondary,
                                fontWeight: "600", fontSize: "0.82rem", cursor: "pointer",
                              }}
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={resetBusy || resetPassword.length < 8}
                              style={{
                                flex: 1, background: theme.primary, color: "#fff", border: "none",
                                borderRadius: "10px", padding: "11px", fontWeight: "bold",
                                fontSize: "0.82rem", cursor: "pointer",
                                opacity: resetBusy || resetPassword.length < 8 ? 0.6 : 1,
                              }}
                            >
                              {resetBusy ? "Envoi..." : "Enregistrer"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          className="adm-full"
          onClick={handleLogout}
          style={{ width: "100%", background: "transparent", border: `2px solid ${theme.borderLight}`, borderRadius: "14px", padding: "14px", color: theme.textSecondary, fontWeight: "600", fontSize: "0.88rem", cursor: "pointer" }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}