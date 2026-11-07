import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../lib/useTheme";
import HeaderActions from '../components/HeaderActions'
import { useSubscription } from '../hooks/useSubscription'
import ReceiptModal from '../components/ReceiptModal'
import {
  Bell,
  BellRing,
  Sun,
  Moon,
  QrCode,
  Clipboard,
  Settings, AlertTriangle, Gift, Flame, Lock, UtensilsCrossed, ShoppingBag, Trash2, BarChart3, Wallet, Hourglass,
  Receipt, Printer, Package,
} from 'lucide-react'

const STATUS_LABELS = {
  received: { label: 'Reçue', bg: '#FFF9C4', color: '#7B6000' },
  preparing: { label: 'En préparation', bg: '#DBEAFE', color: '#1E40AF' },
  ready: { label: 'Prête', bg: '#DCFCE7', color: '#166534' },
  served: { label: 'Servie', bg: '#E0E7FF', color: '#3730A3' },
  paid: { label: 'Soldée', bg: '#F0FDF4', color: '#166534' },
  cancelled: { label: 'Annulée', bg: '#F3F4F6', color: '#6B7280' },
};

const NEXT_STATUS = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
  served: "paid",
  paid: null,
  cancelled: null,
};

const NEXT_LABEL = {
  received: "Démarrer préparation",
  preparing: "Marquer prête",
  ready: "Marquer servie",
  served: "Marquer soldée",
  paid: null,
  cancelled: null,
};

// ── Réception paiement abonnement — Mobile Money, confirmation manuelle.
// Phase 2 révisée (08 août 2026) : pas de compte bancaire ni d'agrégateur,
// juste deux numéros de réception + override manuel côté SuperAdmin.jsx.
const PAYMENT_INFO = {
  holder: 'Jésus-Net',
  mtn: '065991104',
  airtel: '050406599',
};

function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
    gain1.gain.setValueAtTime(0.8, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.7);
    gain2.gain.setValueAtTime(0.6, ctx.currentTime + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.start(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.9);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.setValueAtTime(550, ctx.currentTime + 0.8);
    osc3.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
    gain3.gain.setValueAtTime(0.5, ctx.currentTime + 0.8);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    osc3.start(ctx.currentTime + 0.8);
    osc3.stop(ctx.currentTime + 1.4);
  } catch {
    console.log('Audio non supporté');
  }
}

// ── Bloc réutilisable — affiché dans les bannières trial (J-3) et suspended.
// Copie presse-papier par numéro, ton visuel adapté à l'urgence (trial vs suspended).
function PaymentInstructions({ brand, copiedNumber, onCopy, tone = 'trial' }) {
  const isUrgent = tone === 'suspended';
  const textColor = isUrgent ? '#92400E' : '#7B6000';

  return (
    <div style={{
      marginTop: '14px',
      paddingTop: '14px',
      borderTop: `1px dashed ${isUrgent ? '#F59E0B' : '#F0C93D'}`,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '600', color: textColor }}>
        Pour réactiver — Mobile Money, réf. « {brand.name} »
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { label: 'MTN Mobile Money', number: PAYMENT_INFO.mtn },
          { label: 'Airtel Money', number: PAYMENT_INFO.airtel },
        ].map((line) => (
          <div
            key={line.number}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '8px 12px',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: textColor, opacity: 0.75 }}>{line.label}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: textColor, fontFamily: 'monospace' }}>
                {line.number}
              </p>
            </div>
            <button
              onClick={() => onCopy(line.number)}
              style={{
                background: 'transparent', border: `1.5px solid ${textColor}55`,
                borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: '600', color: textColor,
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <Clipboard size={12} />
              {copiedNumber === line.number ? 'Copié !' : 'Copier'}
            </button>
          </div>
        ))}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: '0.7rem', color: textColor, opacity: 0.8, lineHeight: 1.5 }}>
        Titulaire : {PAYMENT_INFO.holder}. Une fois le transfert effectué, contactez-nous
        (WhatsApp/email) pour confirmation — la réactivation est faite manuellement sous peu.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  // Timer de l'alerte "nouvelle commande" : sans ref, chaque commande
  // entrante empile un setTimeout jamais annulé (fuite + setState sur un
  // composant potentiellement démonté).
  const alertTimerRef = useRef(null);
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0, topItem: null });
  const [processingOrderId, setProcessingOrderId] = useState(null);
  // ── Sessions signalées "J'ai terminé" par le client, en attente de clôture réception ──
  const [pendingClosureSessions, setPendingClosureSessions] = useState(new Set());
  // ── Clôture de session en cours (spinner bouton) + reçu à afficher après succès ──
  const [closingSessionId, setClosingSessionId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  // ── Copie presse-papier des numéros Mobile Money (bannières trial/suspended) ──
  const [copiedNumber, setCopiedNumber] = useState(null);

  function copyNumber(number) {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    setTimeout(() => setCopiedNumber(null), 2000);
  }

  // ── ABONNEMENT + RESTAURANT — vient du SubscriptionProvider posé par AdminRoute.
  // Résout owner OU réception, source unique — Dashboard.jsx ne fait plus sa
  // propre requête restaurant en doublon (c'était la cause du blocage infini
  // pour tout compte non-propriétaire).
  const {
    subscriptionStatus, features, trialEndAt,
    restaurantId, restaurantName, restaurantBrand, isOwner,
    loading: contextLoading,
  } = useSubscription();

  const trialDaysLeft = trialEndAt
    ? Math.ceil((new Date(trialEndAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const brand = {
    name: restaurantName || 'Restaurant',
    primary_color: restaurantBrand?.primary_color || '#1F2A44',
    secondary_color: restaurantBrand?.secondary_color || '#C9A84C',
    logo_url: restaurantBrand?.logo_url || '',
  };

  // ── THÈME — appelé inconditionnellement, avant tout return ──
  const { theme, darkMode, toggleDarkMode } = useTheme(brand.primary_color);

  // ─── INIT : commandes actives + sessions en attente de clôture + channel Realtime ───
  useEffect(() => {
    if (contextLoading) return; // useSubscription() n'a pas fini de résoudre le compte

    if (!restaurantId) {
      // Compte authentifié mais ni propriétaire ni réception d'aucun
      // restaurant (ex: compte cuisine testant /dashboard par erreur) —
      // on sort du chargement au lieu de rester bloqué indéfiniment.
      // queueMicrotask : évite l'avertissement React sur setState
      // synchrone dans le corps d'un effet (avant tout await).
      queueMicrotask(() => setLoading(false));
      return;
    }

    let channel;
    let cancelled = false;

    async function init() {
      const { data } = await supabase
        .from("orders")
        .select("id, status, table_number, customer_name, order_type, items, session_id, created_at, estimated_ready_at")
        .eq("restaurant_id", restaurantId)
        .neq("status", "paid")
        .order("created_at", { ascending: true });

      if (cancelled) return;
      setOrders(data || []);
      setLoading(false);

      // ── Sessions déjà en attente de clôture au chargement (ex: après refresh) ──
      const { data: pendingSessions } = await supabase
        .from("order_sessions")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending_closure");

      if (!cancelled) {
        setPendingClosureSessions(new Set((pendingSessions || []).map((s) => s.id)));
      }

      channel = supabase
        .channel("dashboard-" + restaurantId)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        }, (payload) => {
          if (payload.eventType === "INSERT") {
            playNotification();
            setNewOrderAlert(true);
            clearTimeout(alertTimerRef.current);
            alertTimerRef.current = setTimeout(() => setNewOrderAlert(false), 3000);
            setOrders((prev) => [...prev, payload.new]);
          }
          if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              payload.new.status === "paid"
                ? prev.filter((o) => o.id !== payload.new.id)
                : prev.map((o) => o.id === payload.new.id ? payload.new : o)
            );
          }
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "order_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        }, (payload) => {
          setPendingClosureSessions((prev) => {
            const next = new Set(prev);
            if (payload.new.status === "pending_closure") {
              if (!prev.has(payload.new.id)) playNotification();
              next.add(payload.new.id);
            } else {
              next.delete(payload.new.id);
            }
            return next;
          });
        })
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      clearTimeout(alertTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [contextLoading, restaurantId]);

  // ─── STATS : dépend uniquement de restaurantId ───
  const fetchTodayStats = useCallback(async () => {
    if (!restaurantId) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Seuls `items` et `created_at` servent au calcul — inutile de rapatrier
    // toute la ligne (cette requête tourne toutes les 60 s).
    const { data: paidToday } = await supabase
      .from('orders_archive')
      .select('items, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'paid')
      .gte('created_at', startOfDay.toISOString());

    const ordersToday = paidToday || [];
    const revenue = ordersToday.reduce((sum, o) =>
      sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0);

    const itemCounts = {};
    ordersToday.forEach(o => {
      o.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
      });
    });
    const topEntry = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
    const topItem = topEntry ? { name: topEntry[0], qty: topEntry[1] } : null;

    setTodayStats(prev => {
      const same = prev.count === ordersToday.length
        && prev.revenue === revenue
        && prev.topItem?.name === topItem?.name
        && prev.topItem?.qty === topItem?.qty;
      return same ? prev : { count: ordersToday.length, revenue, topItem };
    });
  }, [restaurantId]);

  // ─── POLLING ───
  useEffect(() => {
    if (!restaurantId) return;

    let cancelled = false;

    async function runFetch() {
      if (!cancelled) await fetchTodayStats();
    }

    runFetch();
    const interval = setInterval(fetchTodayStats, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [restaurantId, fetchTodayStats]);

  // ── Source unique de vérité : toute transition de statut passe par la RPC.
  // Plus de update/insert/delete dispersés — la logique de validité des
  // transitions et l'archivage atomique (ready→served→paid) vivent côté DB.
  async function transitionStatus(orderId, newStatus) {
    if (processingOrderId === orderId) return;
    setProcessingOrderId(orderId);

    const { error } = await supabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });

    if (error) {
      console.error('Transition de statut refusée', error);
      alert('Action impossible : ' + error.message);
    } else if (newStatus === 'paid') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      fetchTodayStats();
    } else {
      // Mise à jour optimiste — en plus du Realtime (pas à sa place).
      // Le Realtime reste actif juste en dessous pour notifier les autres
      // écrans (cuisine, client). Ceci évite seulement d'attendre son
      // aller-retour pour rafraîchir CET écran après TON propre clic.
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }

    setProcessingOrderId(null);
  }

  // ── Transition groupée par session — "Tout envoyer en cuisine" ──
  async function sendSessionToKitchen(sessionId) {
    if (processingOrderId === sessionId) return;
    setProcessingOrderId(sessionId);

    const { error } = await supabase.rpc('transition_session_orders_status', {
      p_session_id: sessionId,
      p_new_status: 'preparing',
    });

    if (error) {
      console.error('Envoi en cuisine groupé refusé', error);
      alert('Action impossible : ' + error.message);
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.session_id === sessionId && o.status === 'received'
            ? { ...o, status: 'preparing' }
            : o
        )
      );
    }

    setProcessingOrderId(null);
  }

  // ── Clôture de session + encaissement — réutilise transition_session_orders_status
  // côté DB (served -> paid, archivage), génère un reçu récapitulatif côté front.
  async function closeSessionAndCharge(group) {
    if (closingSessionId === group.sessionId) return;
    const confirmClose = window.confirm(
      `Clôturer et encaisser la table ${group.tableNumber} (${group.orders.length} commande${group.orders.length > 1 ? 's' : ''}) ?`
    );
    if (!confirmClose) return;
    setClosingSessionId(group.sessionId);

    // Capture des données AVANT l'appel RPC — les commandes vont être
    // archivées puis supprimées de `orders`, donc plus disponibles ensuite.
    const items = [];
    group.orders.forEach((o) => {
      o.items.forEach((i) => {
        const existing = items.find((x) => x.name === i.name && x.price === i.price);
        if (existing) existing.qty += i.qty;
        else items.push({ ...i });
      });
    });
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const { data, error } = await supabase.rpc('close_session_and_charge', {
      p_session_id: group.sessionId,
    });

    if (error) {
      console.error('Clôture refusée', error);
      alert('Action impossible : ' + error.message);
    } else {
      setOrders((prev) => prev.filter((o) => o.session_id !== group.sessionId));
      setPendingClosureSessions((prev) => {
        const next = new Set(prev);
        next.delete(group.sessionId);
        return next;
      });
      setReceipt({
        tableNumber: group.tableNumber,
        sessionNumber: data?.session_number,
        items,
        total,
        closedAt: data?.closed_at || new Date().toISOString(),
      });
      fetchTodayStats();
    }

    setClosingSessionId(null);
  }

  async function deleteOrder(orderId) {
    await supabase.from("orders").delete().eq("id", orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  if (contextLoading || loading)
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

  if (!restaurantId)
    return (
      <div
        style={{
          background: theme.pageBackground,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <p style={{ color: theme.textPrimary, textAlign: "center" }}>
          Restaurant introuvable pour ce compte.
        </p>
      </div>
    );

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  // ── Regroupement par session (sur place) — une session = une table, un reçu ──
  // Les commandes "emporter" n'ont pas de session_id, elles restent isolées.
  function groupBySession(list) {
    const groups = new Map();
    list.forEach((o) => {
      const key = o.session_id || `solo-${o.id}`;
      if (!groups.has(key)) {
        groups.set(key, { sessionId: o.session_id, tableNumber: o.table_number, orders: [] });
      }
      groups.get(key).orders.push(o);
    });
    return Array.from(groups.values());
  }

  const activeGroups = groupBySession(activeOrders);

  return (
    <>
      <div
        className={receipt ? "dashboard-print-hide" : ""}
        style={{ background: theme.pageBackground, minHeight: "100vh" }}
      >
        <style>{DASH_CSS}</style>


      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${brand.primary_color}CC, ${brand.primary_color})`,
        padding: '24px 20px', position: 'sticky', top: 0, zIndex: 40,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div className="db-head-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {brand.logo_url && (
              <img src={brand.logo_url} alt="logo" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand.secondary_color}`, flexShrink: 0 }} />
            )}
            <div>
              <p style={{ color: brand.secondary_color, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'Georgia, serif' }}>
                Tableau de bord
              </p>
              <h1 style={{ color: '#fff', fontSize: '1.3rem', fontFamily: 'Georgia, serif', margin: 0 }}>
                {brand.name}
              </h1>
              {newOrderAlert && (
                <div style={{
                  background: brand.secondary_color, borderRadius: '20px', padding: '5px 12px',
                  fontSize: '0.72rem', fontWeight: 'bold', color: '#fff',
                  animation: 'pulse 0.5s ease infinite alternate',
                  marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px'
                }}>
                  <Bell size={12} /> Nouvelle commande !
                </div>
              )}
            </div>
          </div>
          <HeaderActions
            theme={theme}
            actions={[
              {
                label: (
                  <>
                    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{darkMode ? "Mode clair" : "Mode sombre"}</span>
                  </>
                ),
                onClick: toggleDarkMode,
              },
              {
                label: (
                  <>
                    <QrCode size={16} />
                    <span>QR Code</span>
                  </>
                ),
                onClick: () => navigate("/qrcode"),
              },
              {
                label: (
                  <>
                    <Clipboard size={16} />
                    <span>Menu</span>
                  </>
                ),
                onClick: () => navigate("/menu-manager"),
              },
              {
                label: (
                  <>
                    <Package size={16} />
                    <span>Inventaire</span>
                  </>
                ),
                onClick: () => navigate("/inventory"),
              },
              {
                label: (
                  <>
                    <Settings size={16} />
                    <span>Paramètres</span>
                  </>
                ),
                onClick: () => navigate("/settings"),
                bg: brand.secondary_color,
              },
            ]}
          />
        </div>
      </div>

      <div className="db-wrap">

        {/* BANNIÈRE ABONNEMENT — visible seulement si accès dégradé.
            Responsive : passe en colonne sous ~420px (bouton pleine largeur)
            au lieu de wrap brut qui écrasait le texte contre le bouton.
            Instructions de paiement Mobile Money intégrées ci-dessous
            (Phase 2 révisée — réception manuelle, pas d'agrégateur). */}
        {subscriptionStatus === 'suspended' && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '18px',
            padding: '18px 20px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#92400E', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <AlertTriangle size={16} /> Abonnement suspendu — mode limité
                </p>
                <p style={{ margin: '6px 0 0', color: '#92400E', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Vos commandes en cours continuent normalement. Certaines fonctionnalités (stats, branding) sont désactivées.
                </p>
              </div>
            </div>

            {isOwner && (
              <PaymentInstructions
                theme={theme}
                brand={brand}
                copiedNumber={copiedNumber}
                onCopy={copyNumber}
                tone="suspended"
              />
            )}
          </div>
        )}

        {/* Rappel discret pendant l'essai — permanent, avec urgence accrue à J-3.
            Instructions de paiement affichées seulement à J-3 pour ne pas
            surcharger l'écran pendant le reste de l'essai. */}
        {subscriptionStatus === 'trial' && trialDaysLeft !== null && (
          <div style={{
            background: trialDaysLeft <= 3 ? '#FFF9C4' : theme.cardBackground,
            border: `1px dashed ${trialDaysLeft <= 3 ? '#F59E0B' : theme.borderLight}`,
            borderRadius: '18px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: trialDaysLeft <= 3 ? '#7B6000' : theme.textSecondary,
          }}>
            {trialDaysLeft <= 3
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Hourglass size={14} /> Votre essai se termine dans {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''}.</span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Gift size={14} /> Vous êtes en période d'essai — toutes les fonctionnalités sont actives ({trialDaysLeft} jours restants).</span>}

            {trialDaysLeft <= 3 && isOwner && (
              <PaymentInstructions
                theme={theme}
                brand={brand}
                copiedNumber={copiedNumber}
                onCopy={copyNumber}
                tone="trial"
              />
            )}
          </div>
        )}

        {/* STATS DU JOUR */}
        {features.stats ? (
          <div style={{
            background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.primary_color}DD)`,
            borderRadius: '22px', padding: '24px', marginBottom: '24px',
            boxShadow: `0 4px 16px ${theme.textSecondary}40`,
            textAlign: "center",
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Georgia, serif' }}>
              Aujourd'hui
            </p>
            <div className="db-hero-stats">
              <div style={{ flex: '1 1 auto', minWidth: '80px' }}>
                <p style={{ margin: 0, color: '#fff', fontSize: '1.6rem', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                  {todayStats.count}
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                  commande(s) vendue(s)
                </p>
              </div>
              <div style={{ flex: '1 1 auto', minWidth: '80px' }}>
                <p style={{ margin: 0, color: brand.secondary_color, fontSize: '1.6rem', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                  {todayStats.revenue.toLocaleString()}
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                  FCFA encaissés
                </p>
              </div>
              {todayStats.topItem && (
                <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
                  <p style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 'bold', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Flame size={15} /> {todayStats.topItem.name}
                  </p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
                    {todayStats.topItem.qty} vendus aujourd'hui
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: theme.cardBackground,
            borderRadius: '22px', padding: '24px', marginBottom: '24px',
            textAlign: "center", border: `1px dashed ${theme.borderLight}`,
          }}>
            <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
              <Lock size={14} /> Statistiques du jour (revenus, best-seller) disponibles avec un abonnement actif
            </p>
          </div>
        )}

        {/* STATS RAPIDES — fond et texte thème */}
        <div className="db-kpis">
          {[
            { label: "En cours", value: activeOrders.length, color: theme.textPrimary },
            { label: "En préparation", value: orders.filter((o) => o.status === "preparing").length, color: "#1E40AF" },
            { label: "Annulées", value: cancelledOrders.length, color: "#6B7280" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                background: theme.cardBackground,
                borderRadius: "18px",
                padding: "18px 14px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: "bold", color: stat.color, fontFamily: "Georgia, serif" }}>
                {stat.value}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.68rem", color: theme.textSecondary }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* COMMANDES ACTIVES — groupées par session (table) */}
        {activeGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: theme.textSecondary }}>
            <UtensilsCrossed size={48} style={{ margin: "0 0 14px" }} />
            <p style={{ fontFamily: "Georgia, serif" }}>
              Aucune commande en cours
            </p>
          </div>
        ) : (
          <div className="db-orders">
            {activeGroups.map((group) => {
              const isGrouped = group.sessionId && group.orders.length > 1;
              const isPendingClosure = group.sessionId && pendingClosureSessions.has(group.sessionId);
              const sessionTotal = group.orders.reduce(
                (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0
              );
              const hasReceivedOrders = group.orders.some((o) => o.status === "received");
              // Toutes les commandes de la session sont servies -> prête à être encaissée
              const allServed = group.sessionId && group.orders.every((o) => o.status === "served");

              return (
                <div
                  key={group.sessionId || group.orders[0].id}
                  style={{
                    background: isGrouped ? theme.pageBackground : "transparent",
                    border: isGrouped ? `2px dashed ${theme.borderLight}` : "none",
                    borderRadius: "22px",
                    padding: isGrouped ? "16px" : "0",
                  }}
                >
                  {(isGrouped || isPendingClosure || allServed) && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: "14px", padding: "0 6px", flexWrap: "wrap", gap: "10px",
                    }}>
                      <p style={{ margin: 0, fontWeight: "bold", color: theme.textPrimary, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "7px" }}>
                        <UtensilsCrossed size={15} /> Table {group.tableNumber} — {group.orders.length} commandes · {sessionTotal.toLocaleString()} FCFA
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {isPendingClosure && (
                          <span style={{
                            background: "#FFF9C4", color: "#7B6000", fontSize: "0.7rem",
                            fontWeight: "700", padding: "5px 12px", borderRadius: "20px",
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            animation: "pulse 1s ease infinite alternate",
                          }}>
                            <BellRing size={12} /> Client prêt à payer
                          </span>
                        )}
                        {hasReceivedOrders && (
                          <button
                            disabled={processingOrderId === group.sessionId}
                            onClick={() => sendSessionToKitchen(group.sessionId)}
                            style={{
                              background: theme.primary, color: "#fff", border: "none",
                              borderRadius: "10px", padding: "8px 14px", fontWeight: "600",
                              fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap",
                              opacity: processingOrderId === group.sessionId ? 0.6 : 1,
                            }}
                          >
                            Tout envoyer en cuisine
                          </button>
                        )}
                        {allServed && (
                          <button
                            disabled={closingSessionId === group.sessionId}
                            onClick={() => closeSessionAndCharge(group)}
                            style={{
                              background: "#166534", color: "#fff", border: "none",
                              borderRadius: "10px", padding: "8px 14px", fontWeight: "600",
                              fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap",
                              opacity: closingSessionId === group.sessionId ? 0.6 : 1,
                              display: "inline-flex", alignItems: "center", gap: "6px",
                            }}
                          >
                            <Receipt size={13} /> {closingSessionId === group.sessionId ? "..." : "Clôturer & encaisser"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {group.orders.map((order) => {
                      const config = STATUS_LABELS[order.status];
                      const nextStatus = NEXT_STATUS[order.status];
                      const nextLabel = NEXT_LABEL[order.status];
                      const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
                      const estimatedTime = order.estimated_ready_at
                        ? new Date(order.estimated_ready_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                        : null;

                      return (
                        <div
                          key={order.id}
                          style={{
                            background: theme.cardBackground,
                            borderRadius: "20px",
                            padding: "22px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 'bold', color: theme.textPrimary, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                {order.order_type === 'emporter'
                                  ? <><ShoppingBag size={15} /> {order.customer_name}</>
                                  : <><UtensilsCrossed size={15} /> Table {order.table_number}</>}
                              </p>
                              <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: theme.textSecondary }}>
                                #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                                {new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{
                                background: config.bg,
                                color: config.color,
                                fontSize: "0.72rem",
                                fontWeight: "600",
                                padding: "5px 12px",
                                borderRadius: "20px",
                              }}>
                                {config.label}
                              </span>
                              {estimatedTime && (
                                <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: theme.textSecondary }}>
                                  Prête à {estimatedTime}
                                </p>
                              )}
                            </div>
                          </div>

                          <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: "16px", marginBottom: "18px" }}>
                            {order.items.map((item, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "8px" }}>
                                <span style={{ color: theme.textPrimary }}>
                                  <span style={{ color: theme.textPrimary, fontWeight: "bold" }}>{item.qty}×</span> {item.name}
                                </span>
                                <span style={{ color: "#C9A84C", fontWeight: "600" }}>
                                  {(item.price * item.qty).toLocaleString()} FCFA
                                </span>
                              </div>
                            ))}
                            <div style={{
                              borderTop: `1px solid ${theme.borderLight}`,
                              paddingTop: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                              fontWeight: "bold",
                              fontSize: "0.88rem",
                            }}>
                              <span style={{ color: theme.textPrimary }}>Total</span>
                              <span style={{ color: theme.textPrimary }}>
                                {total.toLocaleString()} FCFA
                              </span>
                            </div>
                          </div>

                          {nextStatus && (
                            <button
                              disabled={processingOrderId === order.id}
                              onClick={() => transitionStatus(order.id, nextStatus)}
                              style={{
                                width: "100%",
                                background: order.status === "served" ? brand.secondary_color : theme.primary,
                                color: "#fff",
                                border: "none",
                                borderRadius: "12px",
                                padding: "13px",
                                fontWeight: "bold",
                                fontSize: "0.88rem",
                                cursor: processingOrderId === order.id ? "not-allowed" : "pointer",
                                opacity: processingOrderId === order.id ? 0.6 : 1,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                              }}
                            >
                              {order.status === "served" && <Wallet size={15} />}
                              {nextLabel}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMMANDES ANNULÉES — label corrigé pour gérer aussi "à emporter" */}
        {cancelledOrders.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "4px", height: "16px", background: "#6B7280", borderRadius: "2px" }} />
              <h2 style={{ margin: 0, fontSize: "0.8rem", color: "#6B7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Annulées
              </h2>
            </div>
            <div className="db-cancelled">
              {cancelledOrders.map((order) => {
                const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
                return (
                  <div
                    key={order.id}
                    style={{
                      background: theme.cardBackground,
                      borderRadius: "16px",
                      padding: "16px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      opacity: 0.75,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: "bold", color: theme.textSecondary, fontSize: "0.9rem", display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {order.order_type === 'emporter'
                            ? <><ShoppingBag size={14} /> {order.customer_name}</>
                            : <><UtensilsCrossed size={14} /> Table {order.table_number}</>}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: theme.textSecondary }}>
                          #{order.id.slice(0, 8).toUpperCase()} · {total.toLocaleString()} FCFA
                        </p>
                      </div>
                      <button
                        onClick={() => deleteOrder(order.id)}
                        style={{
                          background: "#fee2e2",
                          border: "none",
                          borderRadius: "10px",
                          padding: "9px 14px",
                          color: "#dc2626",
                          fontWeight: "600",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}
                      >
                        <Trash2 size={14} /> Supprimer
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
          className="db-history-btn"
          style={{
            width: "100%",
            background: "transparent",
            border: `2px solid ${theme.borderLight}`,
            borderRadius: "16px",
            padding: "14px",
            color: theme.textPrimary,
            fontWeight: "600",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
          }}
        >
          <BarChart3 size={16} /> Voir l'historique des ventes
        </button>
      </div>
    </div>

    {/* REÇU RESPONSIVE & IMPRIMABLE (OCCUPE TOUTE LA PAGE) */}
    {receipt && (
      <ReceiptModal
        receipt={receipt}
        brand={brand}
        theme={theme}
        onClose={() => setReceipt(null)}
      />
    )}
  </>
  );
}

/* Mise en page du tableau de bord.
   La page etait ecrite entierement en styles en ligne (86 blocs style={{}}).
   Un style en ligne ne peut pas porter de media query : c'est ce qui la
   bloquait a 640px et lui donnait l'air d'une application mobile sur grand
   ecran. Seuls les conteneurs structuraux sont convertis ici ; les styles
   decoratifs (couleurs, polices) restent en ligne, ou ils sont inoffensifs. */
const DASH_CSS = `
.db-wrap{max-width:640px;margin:0 auto;padding:28px 18px}
.db-head-inner{
  max-width:640px;margin:0 auto;display:flex;justify-content:space-between;
  align-items:center;flex-wrap:wrap;gap:14px;
}
.db-hero-stats{display:flex;gap:20px;flex-wrap:wrap}
.db-kpis{display:flex;gap:14px;margin-bottom:28px}
.db-orders{display:flex;flex-direction:column;gap:20px;margin-bottom:36px}
.db-cancelled{display:flex;flex-direction:column;gap:10px}
.db-history-btn{max-width:420px;margin:0 auto}

/* 700px, et non 760 : la feuille partagée (.adm-wrap) bascule à cette largeur.
   Deux pages qui changent de forme à des seuils différents donnent une
   navigation bancale. */
@media (min-width:700px){
  .db-wrap{max-width:1120px;padding:32px 24px 56px}
  .db-head-inner{max-width:1120px}

  /* Les trois chiffres du jour forment une bande : un separateur vertical
     plutot qu'un simple espace, sinon les valeurs flottent sans repere. */
  .db-hero-stats{gap:0}
  .db-hero-stats > div{padding:0 24px}
  .db-hero-stats > div + div{border-left:1px solid rgba(255,255,255,.18)}

  /* Les commandes passent en grille. align-items:start : une carte garde sa
     hauteur propre au lieu de s'etirer sur celle de sa voisine. */
  .db-orders{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
    gap:20px;align-items:start;
  }
  .db-cancelled{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px;align-items:start;
  }
}

/* 1180px, même seuil que .adm-list dans la feuille partagée. */
@media (min-width:1180px){
  .db-wrap,.db-head-inner{max-width:1320px}
  .db-orders{grid-template-columns:repeat(3,minmax(0,1fr))}
  .db-cancelled{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`
