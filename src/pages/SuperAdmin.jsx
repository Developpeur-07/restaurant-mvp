import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
    ShieldCheck, Search, Building2, Calendar, AlertCircle,
    CheckCircle2, Clock, PauseCircle, X, Loader2, TrendingUp, Receipt,
} from "lucide-react";

const STATUS_CONFIG = {
    trial: { label: "Essai", bg: "#DBEAFE", color: "#1E40AF", icon: Clock },
    active: { label: "Actif", bg: "#DCFCE7", color: "#166534", icon: CheckCircle2 },
    grace_period: { label: "Grâce", bg: "#FFF9C4", color: "#7B6000", icon: AlertCircle },
    suspended: { label: "Suspendu", bg: "#FEE2E2", color: "#991B1B", icon: PauseCircle },
};

const OVERRIDE_OPTIONS = [
    { value: "active", label: "Forcer Actif" },
    { value: "suspended", label: "Forcer Suspendu" },
    { value: "trial", label: "Repasser en Essai" },
];

export default function SuperAdmin() {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [overrideTarget, setOverrideTarget] = useState(null); // { restaurant, newStatus }
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    // ── Ventes du jour — clé = restaurant.id ──
    const [salesData, setSalesData] = useState({});
    const [salesLoading, setSalesLoading] = useState({});

    async function fetchRestaurants() {
        setLoading(true);
        const { data } = await supabase
            .from("restaurants")
            .select("id, name, plan, subscription_status, next_billing_date, partner_id")
            .order("name", { ascending: true });
        setRestaurants(data || []);
        setLoading(false);
    }

    useEffect(() => {
    queueMicrotask(() => {
        fetchRestaurants();
    });
  }, []);

    const filtered = search.trim()
        ? restaurants.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()))
        : restaurants;

    const activeCount = restaurants.filter((r) => r.subscription_status === "active").length;

    async function confirmOverride() {
        if (!overrideTarget || submitting) return;
        if (!reason.trim()) {
            setToast({ type: "error", text: "Le motif est obligatoire." });
            return;
        }
        setSubmitting(true);

        const { data, error } = await supabase.rpc("super_admin_override_subscription", {
            p_restaurant_id: overrideTarget.restaurant.id,
            p_new_status: overrideTarget.newStatus,
            p_reason: reason.trim(),
        });

        if (error) {
            setToast({ type: "error", text: "Échec : " + error.message });
        } else {
            setRestaurants((prev) =>
                prev.map((r) => (r.id === data.id ? { ...r, subscription_status: data.subscription_status } : r))
            );
            setToast({ type: "success", text: `${overrideTarget.restaurant.name} → ${STATUS_CONFIG[data.subscription_status].label}` });
            setOverrideTarget(null);
            setReason("");
        }

        setSubmitting(false);
        setTimeout(() => setToast(null), 4000);
    }

    // ── Ventes du jour — appelée à la demande, un clic par restaurant ──
    async function fetchDailySales(restaurantId) {
        setSalesLoading((prev) => ({ ...prev, [restaurantId]: true }));

        const { data, error } = await supabase.rpc("get_daily_sales_by_restaurant", {
            p_restaurant_id: restaurantId,
        });

        if (error) {
            setToast({ type: "error", text: "Erreur ventes : " + error.message });
            setTimeout(() => setToast(null), 4000);
        } else {
            const row = Array.isArray(data) ? data[0] : data;
            setSalesData((prev) => ({ ...prev, [restaurantId]: row }));
        }

        setSalesLoading((prev) => ({ ...prev, [restaurantId]: false }));
    }

    return (
        <div style={{ background: "#FAF8F4", minHeight: "100vh" }}>

            {/* HEADER — respire davantage : plus de padding vertical, hiérarchie claire */}
            <div style={{
                background: "linear-gradient(135deg, #1F2A44, #16203a)",
                padding: "48px 24px 40px",
            }}>
                <div style={{ maxWidth: "960px", margin: "0 auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        <ShieldCheck size={20} color="#C9A84C" />
                        <p style={{ color: "#C9A84C", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", margin: 0, fontFamily: "Georgia, serif" }}>
                            Super Administration
                        </p>
                    </div>
                    <h1 style={{ color: "#fff", fontSize: "2rem", fontFamily: "Georgia, serif", margin: "0 0 8px", fontWeight: "normal" }}>
                        Restaurants
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", margin: 0 }}>
                        {activeCount} restaurant{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} sur {restaurants.length} au total
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px 80px" }}>

                {/* TOAST */}
                {toast && (
                    <div style={{
                        background: toast.type === "success" ? "#F0FDF4" : "#FEF2F2",
                        border: `1px solid ${toast.type === "success" ? "#BBF7D0" : "#FECACA"}`,
                        borderRadius: "12px", padding: "14px 18px", marginBottom: "28px",
                    }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: toast.type === "success" ? "#166534" : "#991B1B" }}>
                            {toast.text}
                        </p>
                    </div>
                )}

                {/* RECHERCHE — espacée, pas collée aux cards */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: "#fff", borderRadius: "14px", padding: "14px 20px",
                    boxShadow: "0 1px 3px rgba(31,42,68,0.08)", marginBottom: "36px",
                }}>
                    <Search size={17} color="#9CA3AF" />
                    <input
                        type="text"
                        placeholder="Rechercher un restaurant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, border: "none", outline: "none", fontSize: "0.92rem", color: "#1F2A44" }}
                    />
                </div>

                {loading ? (
                    <p style={{ textAlign: "center", color: "#9CA3AF", padding: "60px 0" }}>Chargement...</p>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "80px 0", color: "#9CA3AF" }}>
                        <Building2 size={40} style={{ marginBottom: "16px", opacity: 0.4 }} />
                        <p style={{ fontFamily: "Georgia, serif" }}>Aucun restaurant trouvé</p>
                    </div>
                ) : (
                    // ── Cards espacées généreusement, pas collées — chacune a de l'air ──
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {filtered.map((r) => {
                            const status = STATUS_CONFIG[r.subscription_status] || STATUS_CONFIG.trial;
                            const StatusIcon = status.icon;
                            const sales = salesData[r.id];
                            const isSalesLoading = salesLoading[r.id];
                            return (
                                <div
                                    key={r.id}
                                    style={{
                                        background: "#fff", borderRadius: "18px", padding: "28px 32px",
                                        boxShadow: "0 1px 3px rgba(31,42,68,0.06)",
                                        border: "1px solid #F0EDE6",
                                    }}
                                >
                                    <div style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                                        gap: "24px", flexWrap: "wrap", marginBottom: "20px",
                                    }}>
                                        <div>
                                            <h2 style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: "1.15rem", color: "#1F2A44", fontWeight: "normal" }}>
                                                {r.name || "Sans nom"}
                                            </h2>
                                            <p style={{ margin: 0, fontSize: "0.78rem", color: "#9CA3AF" }}>
                                                Plan {r.plan === "pro" ? "Pro" : "Free"}
                                                {r.next_billing_date && (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
                                                        <Calendar size={12} /> {new Date(r.next_billing_date).toLocaleDateString("fr-FR")}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span style={{
                                            display: "inline-flex", alignItems: "center", gap: "6px",
                                            background: status.bg, color: status.color,
                                            fontSize: "0.75rem", fontWeight: "600", padding: "6px 14px", borderRadius: "20px",
                                        }}>
                                            <StatusIcon size={13} /> {status.label}
                                        </span>
                                    </div>

                                    {/* Actions — respirent, séparées visuellement du contenu au-dessus */}
                                    <div style={{
                                        display: "flex", gap: "10px", flexWrap: "wrap",
                                        paddingTop: "18px", borderTop: "1px solid #F5F3EE",
                                    }}>
                                        {OVERRIDE_OPTIONS
                                            .filter((opt) => opt.value !== r.subscription_status)
                                            .map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => { setOverrideTarget({ restaurant: r, newStatus: opt.value }); setReason(""); }}
                                                    style={{
                                                        background: "transparent",
                                                        border: "1.5px solid #E5E1D8",
                                                        borderRadius: "10px",
                                                        padding: "8px 16px",
                                                        fontSize: "0.78rem",
                                                        fontWeight: "600",
                                                        color: "#1F2A44",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}

                                        <button
                                            onClick={() => fetchDailySales(r.id)}
                                            disabled={isSalesLoading}
                                            style={{
                                                background: "#1F2A44",
                                                border: "1.5px solid #1F2A44",
                                                borderRadius: "10px",
                                                padding: "8px 16px",
                                                fontSize: "0.78rem",
                                                fontWeight: "600",
                                                color: "#fff",
                                                cursor: isSalesLoading ? "not-allowed" : "pointer",
                                                opacity: isSalesLoading ? 0.6 : 1,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}
                                        >
                                            {isSalesLoading
                                                ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                                                : <TrendingUp size={13} />}
                                            Ventes du jour
                                        </button>
                                    </div>

                                    {/* Résultat ventes — n'apparaît qu'après le clic, pour ce restaurant */}
                                    {sales && (
                                        <div style={{
                                            marginTop: "16px",
                                            background: "#FAF8F4",
                                            borderRadius: "12px",
                                            padding: "14px 18px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: "10px",
                                        }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#4B5563" }}>
                                                <Receipt size={14} />
                                                {sales.transaction_count} transaction{sales.transaction_count !== 1 ? "s" : ""} Mobile Money
                                                {" · "}
                                                {new Date(sales.sales_date).toLocaleDateString("fr-FR")}
                                            </span>
                                            <span style={{ fontWeight: "bold", color: "#1F2A44", fontSize: "1rem" }}>
                                                {Number(sales.total_amount).toLocaleString()} FCFA
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODALE OVERRIDE — confirmation + motif obligatoire */}
            {overrideTarget && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(31,42,68,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 60, padding: "24px",
                }}>
                    <div style={{ background: "#fff", borderRadius: "20px", padding: "36px", width: "100%", maxWidth: "440px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                            <div>
                                <p style={{ margin: "0 0 4px", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF" }}>
                                    Override manuel
                                </p>
                                <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "1.2rem", color: "#1F2A44", fontWeight: "normal" }}>
                                    {overrideTarget.restaurant.name}
                                </h2>
                            </div>
                            <button
                                onClick={() => setOverrideTarget(null)}
                                style={{ background: "#F5F3EE", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#9CA3AF" }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: "24px", lineHeight: 1.5 }}>
                            Cette action force le statut à{" "}
                            <strong style={{ color: "#1F2A44" }}>
                                {OVERRIDE_OPTIONS.find((o) => o.value === overrideTarget.newStatus)?.label}
                            </strong>{" "}
                            immédiatement, en dehors du cycle automatique. Elle sera tracée dans l'historique.
                        </p>

                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                            Motif (obligatoire)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: geste commercial suite à litige, paiement confirmé par WhatsApp en attendant le webhook..."
                            rows={3}
                            style={{
                                width: "100%", border: "1.5px solid #E5E1D8", borderRadius: "10px",
                                padding: "12px 14px", fontSize: "0.85rem", outline: "none",
                                boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                                marginBottom: "24px", color: "#1F2A44",
                            }}
                        />

                        <div style={{ display: "flex", gap: "12px" }}>
                            <button
                                onClick={() => setOverrideTarget(null)}
                                style={{
                                    flex: 1, background: "transparent", border: "1.5px solid #E5E1D8",
                                    borderRadius: "10px", padding: "13px", fontWeight: "600", fontSize: "0.85rem",
                                    color: "#6B7280", cursor: "pointer",
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                disabled={submitting || !reason.trim()}
                                onClick={confirmOverride}
                                style={{
                                    flex: 1, background: "#1F2A44", color: "#fff", border: "none",
                                    borderRadius: "10px", padding: "13px", fontWeight: "600", fontSize: "0.85rem",
                                    cursor: submitting || !reason.trim() ? "not-allowed" : "pointer",
                                    opacity: submitting || !reason.trim() ? 0.5 : 1,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                }}
                            >
                                {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Confirmer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
}