import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [brand, setBrand] = useState({
    name: '',
    primary_color: '#8B0000',
    secondary_color: '#C9A84C',
    slogan: '',
    address: '',
    logo_url: ''
  })
  const [brandLoading, setBrandLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (resto) {
        setBrand({
          name: resto.name || '',
          primary_color: resto.primary_color || '#8B0000',
          secondary_color: resto.secondary_color || '#C9A84C',
          slogan: resto.slogan || '',
          address: resto.address || '',
          logo_url: resto.logo_url || ''
        })
      }
    }
    init()
  }, [])

  async function handleBrandSave() {
    setBrandLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: brand.name,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
        slogan: brand.slogan,
        address: brand.address,
        logo_url: brand.logo_url
      })
      .eq('owner_id', user.id)

    setBrandLoading(false)
    setMessage({ type: error ? 'error' : 'success', text: error ? 'Erreur lors de la sauvegarde' : 'Identité mise à jour ✓' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Les mots de passe ne correspondent pas",
      });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Minimum 6 caractères" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: "Erreur lors du changement" });
      return;
    }
    setMessage({ type: "success", text: "Mot de passe mis à jour ✓" });
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleAddAdmin() {
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
            maxWidth: "480px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            ← Retour
          </button>
          <div>
            <p
              style={{
                color: "#C9A84C",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                margin: 0,
                fontFamily: "Georgia, serif",
              }}
            >
              Administration
            </p>
            <h1
              style={{
                color: "#fff",
                fontSize: "1.4rem",
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              Paramètres
            </h1>
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px" }}
      >
        {/* MESSAGE */}
        {message && (
          <div
            style={{
              background: message.type === "success" ? "#f0fff0" : "#fff0f0",
              border: `1px solid ${message.type === "success" ? "#90EE90" : "#ffcccc"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: message.type === "success" ? "#2d6b2d" : "#cc0000",
              }}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* COMPTE ACTUEL */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 2px 8px rgba(139,0,0,0.08)",
          }}
        >
          <h2
            style={{
              color: "#8B0000",
              fontFamily: "Georgia, serif",
              fontSize: "1rem",
              margin: "0 0 12px",
            }}
          >
            Compte actuel
          </h2>
          <p style={{ color: "#666", fontSize: "0.85rem", margin: 0 }}>
            📧 {user?.email}
          </p>
        </div>

        {/* IDENTITÉ VISUELLE */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(139,0,0,0.08)' }}>
          <h2 style={{ color: '#8B0000', fontFamily: 'Georgia, serif', fontSize: '1rem', margin: '0 0 16px' }}>
            Identité visuelle
          </h2>

          {/* PREVIEW */}
          <div style={{
            background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color}CC)`,
            borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px'
          }}>
            {brand.logo_url && (
              <img src={brand.logo_url} alt="logo" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px' }} />
            )}
            <p style={{ color: brand.secondary_color, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              {brand.slogan || 'Votre slogan ici'}
            </p>
            <p style={{ color: '#fff', fontSize: '1.3rem', fontFamily: 'Georgia, serif', fontWeight: 'bold', margin: '0 0 4px' }}>
              {brand.name || 'Nom du restaurant'}
            </p>
            <div style={{ width: '30px', height: '2px', background: brand.secondary_color, margin: '6px auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', margin: 0 }}>
              {brand.address || 'Votre adresse'}
            </p>
          </div>

          {/* CHAMPS */}
          {[
            { label: 'Nom du restaurant', key: 'name', type: 'text', placeholder: 'Ex: Le Bourgeois' },
            { label: 'Slogan', key: 'slogan', type: 'text', placeholder: 'Ex: Le Goût Du Bon Gâteau' },
            { label: 'Adresse', key: 'address', type: 'text', placeholder: 'Ex: Marché Moungali, Brazzaville' },
            { label: 'URL du logo', key: 'logo_url', type: 'text', placeholder: 'https://...' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={brand[field.key]}
                onChange={e => setBrand(prev => ({ ...prev, [field.key]: e.target.value }))}
                style={{
                  width: '100%', border: '2px solid #e8ddd4', borderRadius: '10px',
                  padding: '10px 14px', fontSize: '0.88rem', background: '#FFF8F0',
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          ))}

          {/* COULEURS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Couleur principale', key: 'primary_color' },
              { label: 'Couleur accent', key: 'secondary_color' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
                  {field.label}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={brand[field.key]}
                    onChange={e => setBrand(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ width: '44px', height: '44px', borderRadius: '8px', border: '2px solid #e8ddd4', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    value={brand[field.key]}
                    onChange={e => setBrand(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ flex: 1, border: '2px solid #e8ddd4', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', background: '#FFF8F0', outline: 'none', minWidth: 0 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleBrandSave}
            disabled={brandLoading}
            style={{
              width: '100%', background: '#8B0000', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '12px', fontWeight: 'bold',
              fontSize: '0.88rem', cursor: 'pointer', opacity: brandLoading ? 0.6 : 1
            }}
          >
            {brandLoading ? 'Sauvegarde...' : 'Sauvegarder l\'identité'}
          </button>
        </div>

        {/* CHANGER MOT DE PASSE */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 2px 8px rgba(139,0,0,0.08)",
          }}
        >
          <h2
            style={{
              color: "#8B0000",
              fontFamily: "Georgia, serif",
              fontSize: "1rem",
              margin: "0 0 16px",
            }}
          >
            Changer le mot de passe
          </h2>

          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: "100%",
              border: "2px solid #e8ddd4",
              borderRadius: "10px",
              padding: "11px 14px",
              fontSize: "0.88rem",
              marginBottom: "10px",
              outline: "none",
              boxSizing: "border-box",
              background: "#FFF8F0",
            }}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: "100%",
              border: "2px solid #e8ddd4",
              borderRadius: "10px",
              padding: "11px 14px",
              fontSize: "0.88rem",
              marginBottom: "14px",
              outline: "none",
              boxSizing: "border-box",
              background: "#FFF8F0",
            }}
          />
          <button
            onClick={handlePasswordChange}
            disabled={!newPassword || !confirmPassword || loading}
            style={{
              width: "100%",
              background: "#8B0000",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px",
              fontWeight: "bold",
              fontSize: "0.88rem",
              cursor: "pointer",
              opacity: !newPassword || !confirmPassword || loading ? 0.6 : 1,
            }}
          >
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </button>
        </div>

        {/* AJOUTER UN ADMIN */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 2px 8px rgba(139,0,0,0.08)",
          }}
        >
          <h2
            style={{
              color: "#8B0000",
              fontFamily: "Georgia, serif",
              fontSize: "1rem",
              margin: "0 0 6px",
            }}
          >
            Ajouter un administrateur
          </h2>
          <p style={{ color: "#999", fontSize: "0.75rem", margin: "0 0 14px" }}>
            Un email d'invitation sera envoyé automatiquement
          </p>
          <input
            type="email"
            placeholder="email@restaurant.com"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            style={{
              width: "100%",
              border: "2px solid #e8ddd4",
              borderRadius: "10px",
              padding: "11px 14px",
              fontSize: "0.88rem",
              marginBottom: "12px",
              outline: "none",
              boxSizing: "border-box",
              background: "#FFF8F0",
            }}
          />
          <button
            onClick={handleAddAdmin}
            disabled={!newAdminEmail}
            style={{
              width: "100%",
              background: "#C9A84C",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px",
              fontWeight: "bold",
              fontSize: "0.88rem",
              cursor: "pointer",
              opacity: !newAdminEmail ? 0.6 : 1,
            }}
          >
            Ouvrir le panneau d'invitation →
          </button>
        </div>

        {/* DÉCONNEXION */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            background: "transparent",
            border: "2px solid #ddd",
            borderRadius: "12px",
            padding: "13px",
            color: "#999",
            fontWeight: "600",
            fontSize: "0.88rem",
            cursor: "pointer",
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
