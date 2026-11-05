// src/pages/Inventory.jsx
//
// Module inventaire / stock.
//
// Deux choix structurants, à contre-pied des pages plus anciennes :
//
//   1. Les styles passent par des classes CSS + media queries, pas par des
//      `style={{...}}` en ligne. Un style en ligne ne peut pas réagir à la
//      largeur de l'écran : c'est précisément pourquoi Dashboard, Settings et
//      MenuManager ne sont pas responsives. Ici la base est mobile, puis on
//      élargit à partir de 700px.
//
//   2. Aucune couleur en dur : tout vient du thème (useTheme), donc le mode
//      sombre reste lisible quelle que soit la couleur de marque.
//
// Attention : les classes sont préfixées `inv-`. Tailwind scanne les JSX et
// génère ses utilitaires — un nom comme `w-3` ou `p-4` serait écrasé par une
// règle Tailwind (les cartes de la page d'accueil sont tombées à 12px à cause
// de ça). Un préfixe explicite rend toute collision impossible.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Package, Plus, Minus, Trash2, AlertTriangle,
  Sun, Moon, X, Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";
import { useSubscription } from "../hooks/useSubscription";

const UNITS = ["unité", "kg", "g", "L", "cl", "portion", "bouteille", "paquet", "carton"];

const REASONS = {
  order: "Commande",
  purchase: "Achat",
  adjustment: "Ajustement",
  waste: "Perte",
  initial: "Stock initial",
};

const EMPTY_FORM = {
  name: "",
  unit: "unité",
  quantity: "",
  alert_threshold: "",
  cost_per_unit: "",
  menu_item_id: "",
  quantity_per_serving: "1",
};

export default function Inventory() {
  const navigate = useNavigate();
  const { restaurantId, restaurantName, restaurantBrand, loading: subLoading } = useSubscription();

  const [items, setItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [step, setStep] = useState("1");

  // ── THÈME — appelé inconditionnellement, avant tout return ──
  const { theme, darkMode, toggleDarkMode } = useTheme(restaurantBrand?.primary_color);

  const isMissingTable = (e) =>
    e?.code === "42P01" || e?.code === "PGRST205" || /stock_items/.test(e?.message || "");

  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;

    async function load() {
      setLoading(true);
      const [resItems, resMenu, resMoves] = await Promise.all([
        supabase.from("stock_items").select("*").eq("restaurant_id", restaurantId).order("name"),
        supabase.from("menu_items").select("id, name").eq("restaurant_id", restaurantId).order("name"),
        supabase
          .from("stock_movements")
          .select("id, stock_item_id, delta, reason, note, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      if (!alive) return;

      const fatal = [resItems, resMenu, resMoves].find((r) => r.error && isMissingTable(r.error));
      if (fatal) {
        setTableMissing(true);
        setLoading(false);
        return;
      }
      const other = [resItems, resMenu, resMoves].find((r) => r.error);
      if (other) {
        setError(other.error.message);
        setLoading(false);
        return;
      }

      setItems(resItems.data || []);
      setMenuItems(resMenu.data || []);
      setMovements(resMoves.data || []);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [restaurantId]);

  // ── ÉCRITURES ──────────────────────────────────────────────

  async function createItem(e) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);

    const qty = Number(form.quantity || 0);
    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      unit: form.unit,
      quantity: qty,
      alert_threshold: Number(form.alert_threshold || 0),
      cost_per_unit: form.cost_per_unit === "" ? null : Number(form.cost_per_unit),
      menu_item_id: form.menu_item_id || null,
      quantity_per_serving: Number(form.quantity_per_serving || 1),
    };

    const { data, error: err } = await supabase
      .from("stock_items")
      .insert(payload)
      .select()
      .single();

    if (err) {
      setError(err.message);
    } else {
      setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      // On journalise le stock de départ pour garder une trace.
      if (qty > 0) {
        const { data: mv } = await supabase
          .from("stock_movements")
          .insert({
            restaurant_id: restaurantId,
            stock_item_id: data.id,
            delta: qty,
            reason: "initial",
            note: "Stock initial",
          })
          .select()
          .single();
        if (mv) setMovements((prev) => [mv, ...prev]);
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
    setSaving(false);
  }

  /** Applique une variation de stock : journal + quantité. */
  async function adjust(item, delta, reason, note) {
    if (!delta) return;
    setAdjusting(item.id);
    setError(null);

    const { data: mv, error: errMv } = await supabase
      .from("stock_movements")
      .insert({
        restaurant_id: restaurantId,
        stock_item_id: item.id,
        delta,
        reason,
        note: note || REASONS[reason],
      })
      .select()
      .single();

    if (errMv) {
      setError(errMv.message);
      setAdjusting(null);
      return;
    }

    const next = Math.max(0, Number(item.quantity) + Number(delta));
    const { error: errUp } = await supabase
      .from("stock_items")
      .update({ quantity: next })
      .eq("id", item.id);

    if (errUp) {
      setError(errUp.message);
      setAdjusting(null);
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)));
    setMovements((prev) => [mv, ...prev]);
    setAdjusting(null);
  }

  async function removeItem(item) {
    setAdjusting(item.id);
    setError(null);
    const { error: err } = await supabase.from("stock_items").delete().eq("id", item.id);
    if (err) {
      setError(err.message);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setMovements((prev) => prev.filter((m) => m.stock_item_id !== item.id));
    }
    setAdjusting(null);
  }

  // ── DÉRIVÉS ────────────────────────────────────────────────

  const lowItems = items.filter((i) => Number(i.quantity) <= Number(i.alert_threshold));
  const outItems = items.filter((i) => Number(i.quantity) <= 0);
  const value = items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.cost_per_unit || 0),
    0
  );
  const itemName = (id) => items.find((i) => i.id === id)?.name || "Article supprimé";

  const fill = (i) => {
    const t = Number(i.alert_threshold);
    if (t <= 0) return 100;
    return Math.min(100, (Number(i.quantity) / t) * 100);
  };

  // ── RENDU ──────────────────────────────────────────────────

  if (subLoading || loading) {
    return (
      <div className="inv-loader" style={{ background: theme.pageBackground }}>
        <p style={{ color: theme.textSecondary }}>Chargement de l&apos;inventaire...</p>
      </div>
    );
  }

  return (
    <div className="inv-page" style={{ background: theme.pageBackground, color: theme.textPrimary }}>
      <style>{CSS(theme)}</style>

      <header className="inv-head" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
        <button className="inv-icon-btn" onClick={() => navigate("/dashboard")} title="Retour" style={{ color: theme.textPrimary }}>
          <ArrowLeft size={18} />
        </button>
        <div className="inv-head-title">
          <h1 style={{ color: theme.textPrimary }}>
            <Package size={19} /> Inventaire
          </h1>
          {restaurantName && <span style={{ color: theme.textMuted }}>{restaurantName}</span>}
        </div>
        <button className="inv-icon-btn" onClick={toggleDarkMode} title="Basculer le thème" style={{ color: theme.textPrimary }}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="inv-wrap">
        {tableMissing && (
          <div className="inv-banner inv-banner-info" style={{ background: theme.cardBackground, borderColor: theme.primary }}>
            <strong style={{ color: theme.textPrimary }}>Module non activé sur votre base</strong>
            <p style={{ color: theme.textSecondary }}>
              Les tables d&apos;inventaire n&apos;existent pas encore. Exécutez le script{" "}
              <code>docs/024_inventaire.sql</code> dans Supabase, puis rechargez cette page.
            </p>
          </div>
        )}

        {error && (
          <div className="inv-banner inv-banner-error" style={{ background: theme.cardBackground }}>
            <strong style={{ color: theme.textPrimary }}>Erreur</strong>
            <p style={{ color: theme.textSecondary }}>{error}</p>
            <button className="inv-btn inv-btn-ghost" onClick={() => setError(null)}>Fermer</button>
          </div>
        )}

        {!tableMissing && (
          <>
            {lowItems.length > 0 && (
              <div className="inv-banner inv-banner-warn" style={{ background: theme.cardBackground }}>
                <AlertTriangle size={18} />
                <div>
                  <strong style={{ color: theme.textPrimary }}>
                    {lowItems.length} article{lowItems.length > 1 ? "s" : ""} sous le seuil d&apos;alerte
                  </strong>
                  <p style={{ color: theme.textSecondary }}>
                    {lowItems.slice(0, 4).map((i) => i.name).join(", ")}
                    {lowItems.length > 4 ? "…" : ""}
                  </p>
                </div>
              </div>
            )}

            <section className="inv-stats">
              <div className="inv-stat" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
                <b style={{ color: theme.textPrimary }}>{items.length}</b>
                <span style={{ color: theme.textMuted }}>Articles suivis</span>
              </div>
              <div className="inv-stat" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
                <b style={{ color: outItems.length ? "#E0574B" : theme.textPrimary }}>{outItems.length}</b>
                <span style={{ color: theme.textMuted }}>En rupture</span>
              </div>
              <div className="inv-stat" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
                <b style={{ color: theme.textPrimary }}>
                  {value > 0 ? `${Math.round(value).toLocaleString("fr-FR")} F` : "—"}
                </b>
                <span style={{ color: theme.textMuted }}>Valeur du stock</span>
              </div>
            </section>

            <section className="inv-block" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
              <div className="inv-block-head">
                <h2 style={{ color: theme.textPrimary }}>Articles</h2>
                <button className="inv-btn" onClick={() => setShowForm((v) => !v)} style={{ background: theme.primary, color: "#fff" }}>
                  {showForm ? <X size={15} /> : <Plus size={15} />}
                  {showForm ? "Annuler" : "Ajouter"}
                </button>
              </div>

              {showForm && (
                <form className="inv-form" onSubmit={createItem}>
                  <label className="inv-field">
                    <span style={{ color: theme.textSecondary }}>Nom de l&apos;article</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex. Riz, Poulet, Coca-Cola"
                      required
                      style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                    />
                  </label>

                  <div className="inv-field-row">
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Unité</span>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </label>
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Quantité en stock</span>
                      <input
                        type="number" step="0.001" min="0"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      />
                    </label>
                  </div>

                  <div className="inv-field-row">
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Seuil d&apos;alerte</span>
                      <input
                        type="number" step="0.001" min="0"
                        value={form.alert_threshold}
                        onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      />
                    </label>
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Coût / unité (FCFA)</span>
                      <input
                        type="number" step="1" min="0"
                        value={form.cost_per_unit}
                        onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      />
                    </label>
                  </div>

                  <div className="inv-field-row">
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Plat associé (optionnel)</span>
                      <select
                        value={form.menu_item_id}
                        onChange={(e) => setForm({ ...form, menu_item_id: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      >
                        <option value="">Aucun</option>
                        {menuItems.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="inv-field">
                      <span style={{ color: theme.textSecondary }}>Consommé par portion</span>
                      <input
                        type="number" step="0.001" min="0.001"
                        value={form.quantity_per_serving}
                        onChange={(e) => setForm({ ...form, quantity_per_serving: e.target.value })}
                        style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                      />
                    </label>
                  </div>

                  <button className="inv-btn inv-btn-full" type="submit" disabled={saving} style={{ background: theme.primary, color: "#fff" }}>
                    <Check size={15} /> {saving ? "Enregistrement..." : "Enregistrer l'article"}
                  </button>
                </form>
              )}

              {items.length === 0 ? (
                <p className="inv-empty" style={{ color: theme.textMuted }}>
                  Aucun article pour l&apos;instant. Ajoutez vos premières matières pour suivre
                  vos quantités et être alerté avant la rupture.
                </p>
              ) : (
                <ul className="inv-list">
                  {items.map((i) => {
                    const low = Number(i.quantity) <= Number(i.alert_threshold);
                    const out = Number(i.quantity) <= 0;
                    return (
                      <li key={i.id} className="inv-item" style={{ borderColor: theme.borderLight }}>
                        <div className="inv-item-main">
                          <div className="inv-item-name">
                            <strong style={{ color: theme.textPrimary }}>{i.name}</strong>
                            {i.menu_item_id && (
                              <em style={{ color: theme.textMuted }}>
                                {menuItems.find((m) => m.id === i.menu_item_id)?.name || "plat associé"}
                                {" · "}{i.quantity_per_serving} / portion
                              </em>
                            )}
                          </div>
                          <div className="inv-item-qty">
                            <b style={{ color: out ? "#E0574B" : theme.textPrimary }}>
                              {Number(i.quantity).toLocaleString("fr-FR")}
                            </b>
                            <span style={{ color: theme.textMuted }}>{i.unit}</span>
                            {Number(i.alert_threshold) > 0 && (
                              <span style={{ color: theme.textMuted }}>
                                seuil {Number(i.alert_threshold).toLocaleString("fr-FR")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="inv-bar" style={{ background: theme.pageBackground }}>
                          <div
                            className="inv-bar-fill"
                            style={{
                              width: `${fill(i)}%`,
                              background: out ? "#E0574B" : low ? "#E8A33D" : theme.primary,
                            }}
                          />
                        </div>

                        <div className="inv-item-actions">
                          <div className="inv-stepper" style={{ borderColor: theme.borderLight }}>
                            <span style={{ color: theme.textMuted }}>Ajuster</span>
                            <input
                              type="number" step="0.5" min="0"
                              value={step}
                              onChange={(e) => setStep(e.target.value)}
                              aria-label="Pas d'ajustement"
                              style={{ background: theme.pageBackground, color: theme.textPrimary, borderColor: theme.borderLight }}
                            />
                            <button
                              onClick={() => adjust(i, -Number(step || 0), "waste", "Perte")}
                              disabled={adjusting === i.id}
                              title="Retirer du stock (perte)"
                              style={{ color: theme.textPrimary }}
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => adjust(i, Number(step || 0), "purchase", "Achat")}
                              disabled={adjusting === i.id}
                              title="Ajouter au stock (achat)"
                              style={{ color: theme.textPrimary }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            className="inv-del"
                            onClick={() => removeItem(i)}
                            disabled={adjusting === i.id}
                            title="Supprimer l'article"
                            style={{ color: theme.textMuted }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {movements.length > 0 && (
              <section className="inv-block" style={{ background: theme.cardBackground, borderColor: theme.borderLight }}>
                <div className="inv-block-head">
                  <h2 style={{ color: theme.textPrimary }}>Derniers mouvements</h2>
                </div>
                <ul className="inv-journal">
                  {movements.map((m) => (
                    <li key={m.id} style={{ borderColor: theme.borderLight }}>
                      <span className="inv-jr-name" style={{ color: theme.textPrimary }}>{itemName(m.stock_item_id)}</span>
                      <span className="inv-jr-reason" style={{ color: theme.textMuted }}>
                        {REASONS[m.reason] || m.reason}
                      </span>
                      <span
                        className="inv-jr-delta"
                        style={{ color: Number(m.delta) >= 0 ? "#3AA76D" : "#E0574B" }}
                      >
                        {Number(m.delta) >= 0 ? "+" : ""}{Number(m.delta).toLocaleString("fr-FR")}
                      </span>
                      <span className="inv-jr-date" style={{ color: theme.textMuted }}>
                        {new Date(m.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feuille de styles — base mobile, élargie à partir de 700px.
// ---------------------------------------------------------------------------
const CSS = (t) => `
.inv-page{min-height:100vh;font-family:'Outfit',system-ui,sans-serif}
.inv-loader{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif}

.inv-head{
  display:flex;align-items:center;gap:12px;
  padding:14px 16px;border-bottom:1px solid ${t.borderLight};
  position:sticky;top:0;z-index:20;
}
.inv-head-title{flex:1;min-width:0}
.inv-head-title h1{
  margin:0;font-family:Georgia,serif;font-weight:400;font-size:1.15rem;
  display:flex;align-items:center;gap:8px;
}
.inv-head-title span{display:block;font-size:.74rem;margin-top:2px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-icon-btn{
  flex:none;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;
  background:transparent;border:1px solid ${t.borderLight};cursor:pointer;
}

.inv-wrap{max-width:960px;margin:0 auto;padding:16px 16px 40px;display:flex;flex-direction:column;gap:16px}

.inv-banner{
  display:flex;gap:12px;align-items:flex-start;
  border:1px solid ${t.borderLight};border-left-width:3px;border-radius:12px;padding:14px;
}
.inv-banner p{margin:4px 0 0;font-size:.86rem;line-height:1.5}
.inv-banner-warn{border-left-color:#E8A33D}
.inv-banner-error{border-left-color:#E0574B}
.inv-banner-info{border-left-color:${t.primary}}
.inv-banner code{font-size:.82rem}

.inv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.inv-stat{border:1px solid ${t.borderLight};border-radius:12px;padding:12px 10px;text-align:center}
.inv-stat b{display:block;font-family:Georgia,serif;font-size:1.3rem;line-height:1.2}
.inv-stat span{display:block;font-size:.7rem;margin-top:4px}

.inv-block{border:1px solid ${t.borderLight};border-radius:14px;padding:16px}
.inv-block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.inv-block-head h2{margin:0;font-family:Georgia,serif;font-weight:400;font-size:1.05rem}

.inv-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  border:none;border-radius:10px;padding:9px 14px;font-size:.85rem;font-weight:600;
  cursor:pointer;font-family:inherit;
}
.inv-btn:disabled{opacity:.55;cursor:default}
.inv-btn-full{width:100%;margin-top:6px}
.inv-btn-ghost{background:transparent;border:1px solid ${t.borderLight};color:${t.textPrimary}}

.inv-form{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.inv-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.inv-field span{font-size:.78rem;font-weight:600}
.inv-field input,.inv-field select{
  width:100%;box-sizing:border-box;border:1px solid ${t.borderLight};border-radius:9px;
  padding:10px 11px;font-size:.9rem;font-family:inherit;
}
.inv-field-row{display:grid;grid-template-columns:1fr;gap:12px}

.inv-empty{margin:0;font-size:.88rem;line-height:1.6}

.inv-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.inv-item{border:1px solid ${t.borderLight};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.inv-item-main{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.inv-item-name{display:flex;flex-direction:column;gap:2px;min-width:0}
.inv-item-name strong{font-size:.95rem}
.inv-item-name em{font-style:normal;font-size:.74rem}
.inv-item-qty{display:flex;align-items:baseline;gap:5px;flex:none}
.inv-item-qty b{font-family:Georgia,serif;font-size:1.15rem}
.inv-item-qty span{font-size:.72rem}

.inv-bar{height:6px;border-radius:99px;overflow:hidden}
.inv-bar-fill{height:100%;border-radius:99px;transition:width .4s ease}

.inv-item-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.inv-stepper{display:flex;align-items:center;gap:6px;border:1px solid ${t.borderLight};border-radius:10px;padding:5px 7px}
.inv-stepper span{font-size:.72rem}
.inv-stepper input{width:58px;box-sizing:border-box;border:1px solid ${t.borderLight};
  border-radius:7px;padding:5px 6px;font-size:.82rem;font-family:inherit;text-align:center}
.inv-stepper button{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;
  background:transparent;border:1px solid ${t.borderLight};cursor:pointer}
.inv-stepper button:disabled{opacity:.5;cursor:default}
.inv-del{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;
  background:transparent;border:1px solid ${t.borderLight};cursor:pointer}

.inv-journal{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.inv-journal li{
  display:grid;grid-template-columns:1fr auto;gap:2px 10px;
  padding:9px 0;border-bottom:1px solid ${t.borderLight};font-size:.84rem;
}
.inv-journal li:last-child{border-bottom:none}
.inv-jr-name{font-weight:600}
.inv-jr-delta{font-weight:700;text-align:right}
.inv-jr-reason{font-size:.76rem}
.inv-jr-date{font-size:.74rem;text-align:right}

/* ── À partir de 700px : on élargit au lieu de rester en colonne ── */
@media (min-width:700px){
  .inv-wrap{padding:22px 24px 48px}
  .inv-field-row{grid-template-columns:1fr 1fr}
  .inv-head-title h1{font-size:1.4rem}
  .inv-stat b{font-size:1.6rem}
  .inv-journal li{grid-template-columns:2fr 1fr auto auto;align-items:center}
  .inv-jr-date{text-align:left}
}
`;
