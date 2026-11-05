import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Store, Users, UtensilsCrossed, QrCode, BarChart3,
  ShieldCheck, TrendingUp, Package, Bike, Crown, Bell, ChefHat,
  Globe, Lock, Settings2, PieChart, Layers, Clock, Zap, Check,
} from 'lucide-react';

const GOLD = '#C9A84C';

/* ── Illustrations responsives ───────────────────────────────────
   Chaque illustration existe en trois largeurs. Le navigateur choisit
   celle qui correspond a la taille d'affichage ET a la densite de l'ecran :
   un telephone 3x recupere la grande (nette), un ecran 1x la petite (legere).
   La plus grande variante porte le nom court, les autres un suffixe.        */
const HERO_WIDTHS = [400, 560, 768];
const CARD_WIDTHS = [400, 720, 1100];
const HERO_MAX = 768;
const CARD_MAX = 1100;

const file = (key, w, max) => `/images/${key}${w === max ? '' : `-${w}`}.webp`;
const heroSrcSet = (key) => HERO_WIDTHS.map((w) => `${file(key, w, HERO_MAX)} ${w}w`).join(', ');
const cardSrcSet = (key) => CARD_WIDTHS.map((w) => `${file(key, w, CARD_MAX)} ${w}w`).join(', ');

/* Largeur d'affichage des ecrans du hero : ~485 px en colonne de bureau,
   318 px quand le telephone est borne a 340 px sur mobile. */
const HERO_SIZES = '(min-width:941px) 480px, 318px';

/* ── Contenu ─────────────────────────────────────────────────── */
const HERO_SLIDES = [
  { key: 'hero-qr',       label: 'Le scan',         caption: 'Un QR code par table' },
  { key: 'hero-menu',     label: 'Le menu digital', caption: 'Votre carte, toujours a jour' },
  { key: 'hero-panier',   label: 'Le panier',       caption: 'Le client compose et valide' },
  { key: 'hero-suivi',    label: 'Le suivi',        caption: "De la table jusqu'au service" },
  { key: 'hero-pilotage', label: 'Le pilotage',     caption: 'Vos chiffres, en temps reel' },
];

const MARQUEE_WORDS = [
  'Pizzas', 'Burgers', 'Crêpes', 'Volailles', 'Poissons', 'Salades',
  'Sandwichs', 'Boissons', 'Petit-déjeuner', 'Gâteaux', 'Accompagnements',
];

const STATS = [
  { v: 15,  s: 'min', l: 'Temps de mise en place', Icon: Clock },
  { v: 200, s: '+',   l: 'Commandes / jour',       Icon: TrendingUp },
  { v: 90,  s: '%',   l: 'Réduction des erreurs',  Icon: Zap },
  { v: 12,  s: '+',   l: 'Restaurants gérés',      Icon: Store },
];

const STEPS = [
  {
    n: '01', t: 'Vous paramétrez',
    p: 'Créez votre carte, vos catégories et vos tables. Vos QR codes sont générés automatiquement, prêts à imprimer.',
  },
  {
    n: '02', t: 'Le client commande',
    p: 'Il scanne le QR code de sa table, compose son choix et valide. Aucune application à installer, rien à télécharger.',
  },
  {
    n: '03', t: 'Votre équipe suit',
    p: "La commande arrive en cuisine, la réception suit l'avancement, et vous pilotez le tout en direct.",
  },
];

const CARDS = [
  { cls: 'w-3', key: 'illus-espace',   Icon: ShieldCheck,     t: 'Un espace par restaurant', p: 'Vos données restent isolées, propres à votre établissement.' },
  { cls: 'w-3', key: 'illus-equipe',   Icon: Users,           t: 'Inviter votre équipe',     p: 'Chaque membre reçoit les accès de son rôle.' },
  { cls: 'w-2', key: 'illus-menu',     Icon: UtensilsCrossed, t: 'Gérer votre menu',         p: 'Plats, prix et disponibilité, modifiables en direct.' },
  { cls: 'w-2', key: 'illus-qr',       Icon: QrCode,          t: 'Commande par QR code',     p: 'Le client scanne sa table et commande.' },
  { cls: 'w-2', key: 'illus-pilotage', Icon: BarChart3,       t: 'Suivi et tableau de bord', p: 'Chaque commande suivie, du reçu au service.' },
];

const DELIV = [
  { key: 'liv-stock',      Icon: Package, t: 'Gestion de stock', p: 'Suivez vos quantités en direct et soyez alerté avant la rupture.' },
  { key: 'liv-restaurant', Icon: Store,   t: 'Côté restaurant',  p: 'Vous préparez la commande, puis vous la confiez au livreur.', cls: 'link' },
  { key: 'liv-livreur',    Icon: Bike,    t: 'Côté livreur',     p: "Il reçoit l'adresse et l'itinéraire, vous suivez la course." },
];

const ROLES = [
  { c: GOLD,     Icon: Crown,  t: 'Directeur',   p: "Vue complète : chiffres, abonnement, équipe et paramètres de l'établissement." },
  { c: '#3B82F6', Icon: Bell,   t: 'Réception',   p: 'Commandes, tables et encaissement. Suivi du service en temps réel.' },
  { c: '#F97316', Icon: ChefHat, t: 'Cuisine',     p: "Uniquement les commandes à préparer, dans l'ordre d'arrivée." },
  { c: '#8B5CF6', Icon: Globe,  t: 'Super Admin', p: 'Pilotage multi-établissements, abonnements et accès.' },
];

const ADMIN_FEATS = [
  { c: '#3B82F6', Icon: Globe,     t: 'Multi-établissements',          p: 'Gérez plusieurs restaurants depuis un seul compte. Vue globale unifiée.' },
  { c: '#10B981', Icon: Lock,      t: 'Accès sécurisé par invitation', p: 'Aucun compte public. Chaque accès est validé manuellement.' },
  { c: GOLD,      Icon: Settings2, t: 'Gestion des abonnements',       p: 'Suivez les abonnements actifs, renouvellements et statuts de paiement.' },
  { c: '#EC4899', Icon: PieChart,  t: 'Analytiques avancées',          p: 'Revenus, commandes et performances de chaque établissement en temps réel.' },
  { c: '#F97316', Icon: Bell,      t: 'Alertes et notifications',      p: 'Soyez notifié des commandes urgentes et des événements critiques.' },
  { c: '#8B5CF6', Icon: Layers,    t: 'Architecture multi-rôles',      p: 'Chaque rôle a ses propres accès et interfaces, sans chevauchement.' },
];

const BARS = [38, 62, 45, 80, 55, 95, 70, 48, 86, 60, 74, 52];

const WA_LINK = 'https://wa.me/242065991104';

/* ── Hooks ───────────────────────────────────────────────────── */

/** Observe tous les [data-reveal] et ajoute .in quand ils entrent dans le viewport. */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function AnimatedCounter({ target, suffix = '', duration = 1800 }) {
  const [ref, inView] = useInView(0.4);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value}
      <i>{suffix}</i>
    </span>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
/* ============================================================
   DESIGN TOKENS
   ============================================================ */
:root{
  --navy:#1F2A44;
  --navy-800:#2A3757;
  --navy-900:#161E33;
  --gold:#C9A84C;
  --gold-soft:#E4D3A3;
  --cream:#F7F3EB;
  --cream-2:#FBF8F2;
  --ink:#3A3A3A;
  --muted:#6E7278;
  --line:rgba(31,42,68,.10);
  --line-2:rgba(31,42,68,.06);
  --serif:Georgia,'Times New Roman',serif;
  --sans:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --ease:cubic-bezier(.16,1,.3,1);
  --ease-2:cubic-bezier(.65,0,.35,1);
  --shadow-sm:0 1px 2px rgba(31,42,68,.05),0 4px 14px rgba(31,42,68,.05);
  --shadow-md:0 2px 6px rgba(31,42,68,.06),0 14px 38px rgba(31,42,68,.08);
  --shadow-lg:0 4px 12px rgba(31,42,68,.07),0 30px 70px rgba(31,42,68,.13);
  --r:16px; --r-lg:22px; --r-xl:30px;
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;background:var(--cream);color:var(--navy);
  font-family:var(--sans);-webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{font-family:inherit}

/* grain très léger — donne de la matière sans salir */
body::after{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.028;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}

.wrap{width:100%;max-width:1180px;margin:0 auto;padding:0 24px}
.eyebrow{
  font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
  color:var(--gold);
}
h2.display{
  font-family:var(--serif);font-weight:400;color:var(--navy);
  font-size:clamp(1.75rem,3.8vw,2.9rem);line-height:1.14;letter-spacing:-.015em;
  margin:14px 0 0;
}
.lede{font-size:16px;line-height:1.75;color:var(--muted);margin:16px 0 0;max-width:56ch}

/* ============================================================
   REVEAL — apparition au scroll
   ============================================================ */
[data-reveal]{opacity:0;transform:translateY(26px);
  transition:opacity .9s var(--ease),transform .9s var(--ease)}
[data-reveal].in{opacity:1;transform:none}

/* ============================================================
   NAVBAR
   ============================================================ */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  transition:background .4s var(--ease),box-shadow .4s var(--ease),backdrop-filter .4s;
}
.nav.solid{
  background:rgba(247,243,235,.82);backdrop-filter:blur(18px) saturate(1.4);
  box-shadow:0 1px 0 var(--line),0 10px 30px rgba(31,42,68,.05);
}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:70px}
.brand{display:flex;align-items:center;gap:11px}
.brand-mark{
  width:34px;height:34px;border-radius:10px;background:var(--navy);
  display:grid;place-items:center;position:relative;overflow:hidden;flex:none;
}
.brand-mark::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(140deg,var(--gold) 0%,transparent 55%);opacity:.32;
}
.brand-mark span{font-family:var(--serif);color:var(--gold);font-size:15px;position:relative;z-index:1}
.brand-txt{font-family:var(--serif);font-size:16px;letter-spacing:.01em;line-height:1.1}
.brand-txt small{display:block;font-family:var(--sans);font-size:9.5px;letter-spacing:.2em;
  color:var(--muted);font-weight:600;text-transform:uppercase}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{font-size:14px;font-weight:500;color:var(--ink);position:relative;padding:4px 0}
.nav-links a::after{
  content:'';position:absolute;left:0;bottom:0;height:1.5px;width:0;background:var(--gold);
  transition:width .4s var(--ease);
}
.nav-links a:hover::after{width:100%}
@media(max-width:860px){.nav-links{display:none}}

.btn{
  display:inline-flex;align-items:center;gap:9px;border:0;cursor:pointer;
  font-size:14px;font-weight:600;border-radius:13px;padding:12px 22px;
  transition:transform .35s var(--ease),box-shadow .35s var(--ease),background .3s;
}
.btn-dark{background:var(--navy);color:#fff;box-shadow:0 6px 20px rgba(31,42,68,.18)}
.btn-dark:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(31,42,68,.26)}
.btn-ghost{background:transparent;color:var(--navy);border:1.5px solid var(--line)}
.btn-ghost:hover{border-color:var(--gold);transform:translateY(-2px)}
.btn-gold{background:var(--gold);color:var(--navy-900);box-shadow:0 8px 26px rgba(201,168,76,.34)}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(201,168,76,.46)}

/* ============================================================
   HERO
   ============================================================ */
.hero{position:relative;padding:132px 0 88px;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;z-index:0}
.orb-1{width:520px;height:520px;top:-190px;right:-130px;
  background:radial-gradient(circle,rgba(201,168,76,.22),transparent 68%);
  animation:drift 22s var(--ease-2) infinite alternate}
.orb-2{width:430px;height:430px;bottom:-210px;left:-160px;
  background:radial-gradient(circle,rgba(31,42,68,.13),transparent 68%);
  animation:drift 26s var(--ease-2) infinite alternate-reverse}
@keyframes drift{
  0%{transform:translate(0,0) scale(1)}
  50%{transform:translate(38px,-28px) scale(1.08)}
  100%{transform:translate(-26px,34px) scale(.96)}
}
.hero-grid{
  position:relative;z-index:1;display:grid;grid-template-columns:1.05fr .95fr;
  gap:64px;align-items:center;
}
@media(max-width:940px){.hero-grid{grid-template-columns:1fr;gap:52px}}

.badge{
  display:inline-flex;align-items:center;gap:9px;padding:7px 15px 7px 9px;border-radius:99px;
  background:#fff;border:1px solid rgba(201,168,76,.32);box-shadow:var(--shadow-sm);
  margin-bottom:24px;
}
.badge i{
  width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:linear-gradient(135deg,var(--gold),var(--gold-soft));
}
.badge span{font-size:12.5px;font-weight:600;letter-spacing:.02em}

h1.display{
  font-family:var(--serif);font-weight:400;font-size:clamp(2.4rem,6.2vw,4.1rem);
  line-height:1.06;letter-spacing:-.02em;margin:0 0 20px;
}
.underlined{position:relative;display:inline-block;white-space:nowrap}
.underlined svg{position:absolute;left:0;bottom:-.12em;width:100%;height:.2em;overflow:visible}
.underlined path{
  stroke:var(--gold);stroke-width:5;fill:none;stroke-linecap:round;
  stroke-dasharray:600;stroke-dashoffset:600;
}
.loaded .underlined path{animation:draw 1.4s var(--ease) .55s forwards}
@keyframes draw{to{stroke-dashoffset:0}}

.hero p.lede{font-size:16.5px;margin-bottom:30px}
.hero-cta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:38px}
.hero-trust{display:flex;gap:30px;flex-wrap:wrap;padding-top:26px;border-top:1px solid var(--line)}
.hero-trust div strong{display:block;font-family:var(--serif);font-size:23px;font-weight:400;line-height:1}
.hero-trust div span{font-size:11.5px;color:var(--muted);letter-spacing:.04em}

/* device + slideshow */
.device-stage{position:relative}
.device{
  position:relative;border-radius:30px;background:var(--navy);padding:11px;
  box-shadow:var(--shadow-lg);transform:translateY(var(--py,0)) rotate(-1.2deg);
  transition:transform .5s var(--ease);
}
.device:hover{transform:translateY(var(--py,0)) rotate(0deg) scale(1.012)}
.screen{
  position:relative;border-radius:21px;overflow:hidden;background:var(--navy-900);
  /* le cadre epouse exactement le format des ecrans (9:14) : aucune image rognee */
  aspect-ratio:9/14;
}
/* sur mobile et tablette le telephone reste en portrait ; on le borne
   pour qu'il ne devienne pas enorme quand la colonne prend toute la largeur */
@media(max-width:940px){.device{max-width:340px;margin-inline:auto}}
@media(max-width:560px){.device{max-width:300px}}
.slide{
  position:absolute;inset:0;opacity:0;transform:scale(1.06);
  transition:opacity 1.1s var(--ease),transform 5.5s linear;
}
.slide.on{opacity:1;transform:scale(1)}
.slide img{width:100%;height:100%;object-fit:cover;object-position:top center}
.screen-shade{
  position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to top,rgba(22,30,51,.9) 0%,rgba(22,30,51,.15) 42%,transparent 65%);
}
.screen-cap{position:absolute;left:20px;right:20px;bottom:20px;z-index:2;color:#fff}
.screen-cap b{display:block;font-family:var(--serif);font-size:17px;font-weight:400}
.screen-cap em{font-style:normal;font-size:11.5px;color:var(--gold-soft);letter-spacing:.05em}
.dots{display:flex;gap:6px;margin-top:12px}
.dot{width:16px;height:3px;border-radius:9px;background:rgba(255,255,255,.28);
  border:0;padding:0;cursor:pointer;transition:background .35s,width .35s var(--ease)}
.dot.on{background:var(--gold);width:28px}

/* floating glass chips */
.chip{
  position:absolute;z-index:3;display:flex;align-items:center;gap:10px;
  background:rgba(255,255,255,.9);backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.7);border-radius:15px;padding:11px 14px;
  box-shadow:var(--shadow-md);animation:float 6s var(--ease-2) infinite;
}
.chip b{display:block;font-size:13px;font-weight:600;line-height:1.2}
.chip span{font-size:10.5px;color:var(--muted)}
.chip i{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;flex:none}
.chip-1{top:12%;left:-54px;animation-delay:0s}
.chip-2{bottom:20%;right:-48px;animation-delay:-3s}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
@media(max-width:1100px){.chip{display:none}}

/* ============================================================
   MARQUEE
   ============================================================ */
.marquee{
  background:var(--navy);color:#fff;padding:15px 0;overflow:hidden;
  border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);
}
.track{display:flex;gap:0;width:max-content;animation:scroll-x 34s linear infinite}
.track span{
  display:inline-flex;align-items:center;gap:16px;padding:0 26px;
  font-family:var(--serif);font-size:15px;white-space:nowrap;opacity:.82;
}
.track em{font-style:normal;color:var(--gold);font-size:13px}
@keyframes scroll-x{to{transform:translateX(-50%)}}
.marquee:hover .track{animation-play-state:paused}

/* ============================================================
   STATS
   ============================================================ */
.stats{background:var(--cream-2);padding:76px 0;border-bottom:1px solid var(--line-2)}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line-2);
  border:1px solid var(--line-2);border-radius:var(--r-lg);overflow:hidden}
@media(max-width:820px){.stats-grid{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--cream-2);padding:32px 26px;transition:background .4s var(--ease)}
.stat:hover{background:#fff}
.stat svg{color:var(--gold);margin-bottom:16px;opacity:.9}
.stat strong{
  display:block;font-family:var(--serif);font-weight:400;font-size:clamp(2rem,4vw,2.7rem);
  line-height:1;letter-spacing:-.02em;
}
.stat strong i{font-style:normal;color:var(--gold)}
.stat span{display:block;margin-top:9px;font-size:12.5px;color:var(--muted);letter-spacing:.03em}

/* ============================================================
   STEPS — remplace le « sommaire » : on montre le flux, on ne liste pas
   ============================================================ */
.steps{padding:104px 0}
.steps-head{max-width:640px;margin-bottom:56px}
.flow{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:34px}
@media(max-width:860px){.flow{grid-template-columns:1fr;gap:30px}}
.flow::before{
  content:'';position:absolute;top:37px;left:8%;right:8%;height:1px;background:var(--line);
}
.flow::after{
  content:'';position:absolute;top:37px;left:8%;height:1.5px;width:0;background:var(--gold);
  transition:width 1.9s var(--ease-2);
}
.flow.drawn::after{width:84%}
@media(max-width:860px){.flow::before,.flow::after{display:none}}
.step{position:relative;z-index:1}
.step-n{
  width:74px;height:74px;border-radius:50%;background:var(--cream);border:1.5px solid var(--line);
  display:grid;place-items:center;margin-bottom:24px;position:relative;
  transition:border-color .5s var(--ease),background .5s var(--ease),transform .5s var(--ease);
}
.step:hover .step-n{border-color:var(--gold);background:#fff;transform:translateY(-4px)}
.step-n b{font-family:var(--serif);font-weight:400;font-size:24px;color:var(--gold)}
.step h3{font-family:var(--serif);font-weight:400;font-size:21px;margin:0 0 10px;line-height:1.25}
.step p{margin:0;font-size:14.5px;line-height:1.72;color:var(--muted)}

/* ============================================================
   BENTO
   ============================================================ */
.bento{background:var(--cream-2);padding:104px 0;border-top:1px solid var(--line-2);
  border-bottom:1px solid var(--line-2)}
.bento-head{display:flex;justify-content:space-between;align-items:flex-end;gap:34px;
  margin-bottom:52px;flex-wrap:wrap}
/* mobile-first : une seule colonne par defaut, on ajoute des colonnes en grandissant */
.bento-grid{display:grid;grid-template-columns:1fr;gap:16px}
.w-3,.w-2{grid-column:span 1}
@media(min-width:600px){
  .bento-grid{grid-template-columns:repeat(2,1fr);gap:18px}
  .w-3:first-child{grid-column:span 2}
}
@media(min-width:940px){
  .bento-grid{grid-template-columns:repeat(6,1fr)}
  .w-3{grid-column:span 3}.w-2{grid-column:span 2}
  .w-3:first-child{grid-column:span 3}
}
.card{
  position:relative;background:#fff;border:1px solid var(--line-2);border-radius:var(--r-lg);
  overflow:hidden;transition:transform .55s var(--ease),box-shadow .55s var(--ease),
    border-color .4s var(--ease);
}
.card:hover{transform:translateY(-6px);box-shadow:var(--shadow-md);border-color:rgba(201,168,76,.4)}
/* l'image porte le message : pleine largeur, bien visible */
.card .ph{position:relative;overflow:hidden;background:var(--cream);aspect-ratio:4/3}
.card .ph img{width:100%;height:100%;object-fit:cover;display:block;
  transition:transform 1.1s var(--ease),filter .6s}
.card:hover .ph img{transform:scale(1.07)}
.card .body{padding:18px 18px 20px}
@media(min-width:600px){.card .body{padding:22px 24px 24px}}
.card .head{display:flex;align-items:center;gap:11px;margin-bottom:8px}
.card .ico{
  position:static;flex:0 0 auto;width:34px;height:34px;border-radius:10px;
  display:grid;place-items:center;background:rgba(201,168,76,.14);color:var(--navy);
}
.card h3{font-family:var(--serif);font-weight:400;font-size:17.5px;margin:0;line-height:1.25}
@media(min-width:600px){.card h3{font-size:19px}}
.card p{margin:0;font-size:13.5px;line-height:1.6;color:var(--muted)}
@media(min-width:600px){.card p{font-size:14px}}

/* ============================================================
   LIVRAISON & STOCK
   ============================================================ */
.deliv{padding:104px 0;border-bottom:1px solid var(--line-2)}
.deliv-head{display:flex;justify-content:space-between;align-items:flex-end;gap:34px;
  margin-bottom:44px;flex-wrap:wrap}
/* mobile-first : 1 colonne, puis 3 */
.deliv-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:640px){.deliv-grid{grid-template-columns:repeat(3,1fr);gap:18px}}
.dcard{
  position:relative;background:#fff;border:1px solid var(--line-2);border-radius:var(--r-lg);
  overflow:hidden;transition:transform .55s var(--ease),box-shadow .55s var(--ease),
    border-color .4s var(--ease);
}
.dcard:hover{transform:translateY(-6px);box-shadow:var(--shadow-md);border-color:rgba(201,168,76,.4)}
.dcard .ph{position:relative;overflow:hidden;background:var(--cream);aspect-ratio:4/3}
.dcard .ph img{width:100%;height:100%;object-fit:cover;display:block;
  transition:transform 1.1s var(--ease)}
.dcard:hover .ph img{transform:scale(1.07)}
.dcard .body{padding:18px 18px 20px}
@media(min-width:600px){.dcard .body{padding:22px 24px 24px}}
.dcard .head{display:flex;align-items:center;gap:11px;margin-bottom:8px}
.dcard .ico{flex:0 0 auto;width:34px;height:34px;border-radius:10px;
  display:grid;place-items:center;background:rgba(201,168,76,.14);color:var(--navy)}
.dcard h3{font-family:var(--serif);font-weight:400;font-size:17.5px;margin:0;line-height:1.25}
@media(min-width:600px){.dcard h3{font-size:19px}}
.dcard p{margin:0;font-size:13.5px;line-height:1.6;color:var(--muted)}
@media(min-width:600px){.dcard p{font-size:14px}}
/* le lien restaurant -> livreur, visible uniquement quand les cartes sont cote a cote */
@media(min-width:640px){
  .dcard.link::after{
    content:'';position:absolute;right:-11px;top:32%;width:22px;height:2px;z-index:3;
    background:repeating-linear-gradient(to right,var(--gold) 0 5px,transparent 5px 10px);
    animation:linkFlow 1.6s linear infinite;
  }
}
@keyframes linkFlow{to{background-position:10px 0}}
.deliv-note{margin:24px 0 0;text-align:center;font-size:13px;color:var(--muted);opacity:.9}

/* ============================================================
   ROLES
   ============================================================ */
.roles{padding:104px 0}
.roles-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:52px}
@media(max-width:940px){.roles-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.roles-grid{grid-template-columns:1fr}}
.role{
  background:#fff;border:1px solid var(--line-2);border-radius:var(--r-lg);padding:28px 24px;
  transition:transform .5s var(--ease),box-shadow .5s var(--ease),border-color .4s;
  position:relative;overflow:hidden;
}
.role::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2.5px;
  background:var(--accent,var(--gold));transform:scaleX(0);transform-origin:left;
  transition:transform .6s var(--ease);
}
.role:hover{transform:translateY(-5px);box-shadow:var(--shadow-md);border-color:var(--line)}
.role:hover::before{transform:scaleX(1)}
.role i{
  width:44px;height:44px;border-radius:13px;display:grid;place-items:center;margin-bottom:18px;
  background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);
}
.role h4{font-family:var(--serif);font-weight:400;font-size:17.5px;margin:0 0 8px}
.role p{margin:0;font-size:13.5px;line-height:1.68;color:var(--muted)}

/* ============================================================
   ADMIN (sombre)
   ============================================================ */
.admin{background:var(--navy);color:#fff;padding:104px 0;position:relative;overflow:hidden}
.admin .orb-3{
  width:600px;height:600px;top:-240px;left:50%;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(201,168,76,.16),transparent 66%);
}
.admin h2.display{color:#fff}
.admin .lede{color:rgba(255,255,255,.62)}
.admin .eyebrow{color:var(--gold)}
.admin-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;margin-top:54px}
@media(max-width:940px){.admin-grid{grid-template-columns:1fr;gap:44px}}

.mock{
  background:linear-gradient(165deg,#27334F,#1A2338);border:1px solid rgba(255,255,255,.09);
  border-radius:var(--r-xl);padding:22px;box-shadow:0 40px 90px rgba(0,0,0,.4);
  position:relative;z-index:1;
}
.mock-bar{display:flex;align-items:center;gap:7px;margin-bottom:18px}
.mock-bar span{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.16)}
.mock-bar span:first-child{background:rgba(201,168,76,.75)}
.mock-title{font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.4);margin-left:auto;font-weight:600}
.mock-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.tile{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);
  border-radius:13px;padding:14px}
.tile b{display:block;font-family:var(--serif);font-size:26px;font-weight:400;line-height:1}
.tile span{font-size:10.5px;color:rgba(255,255,255,.45);letter-spacing:.06em}
.chart{display:flex;align-items:flex-end;gap:6px;height:82px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
  border-radius:13px;padding:14px 12px}
.chart div{
  flex:1;border-radius:4px 4px 2px 2px;background:linear-gradient(to top,rgba(201,168,76,.35),rgba(201,168,76,.85));
  transform-origin:bottom;animation:grow .9s var(--ease) backwards;
}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.mock-rows{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.row-live{
  display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:11px 13px;
  font-size:12.5px;
}
.pulse{width:7px;height:7px;border-radius:50%;background:#34D399;flex:none;position:relative}
.pulse::after{content:'';position:absolute;inset:0;border-radius:50%;background:#34D399;
  animation:ping 1.9s var(--ease-2) infinite}
@keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(3.4);opacity:0}}
.row-live em{font-style:normal;margin-left:auto;color:rgba(255,255,255,.4);font-size:11px}

.admin-list{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;position:relative;z-index:1}
@media(max-width:560px){.admin-list{grid-template-columns:1fr}}
.af{
  background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);
  border-radius:15px;padding:18px;transition:background .4s,transform .5s var(--ease),border-color .4s;
}
.af:hover{background:rgba(255,255,255,.07);transform:translateY(-4px);
  border-color:rgba(201,168,76,.35)}
.af i{color:var(--accent);margin-bottom:11px;display:block}
.af b{display:block;font-size:14px;font-weight:600;margin-bottom:5px}
.af span{font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.52)}

/* ============================================================
   CTA
   ============================================================ */
.cta{position:relative;padding:112px 0;overflow:hidden;text-align:center}
.cta-box{
  position:relative;z-index:1;background:var(--navy);border-radius:var(--r-xl);
  padding:72px 40px;overflow:hidden;box-shadow:var(--shadow-lg);
}
.aurora{
  position:absolute;inset:-40%;pointer-events:none;
  background:conic-gradient(from 0deg at 50% 50%,
    rgba(201,168,76,.30),rgba(201,168,76,0) 28%,rgba(201,168,76,0) 72%,rgba(201,168,76,.30));
  animation:spin 16s linear infinite;filter:blur(52px);opacity:.55;
}
@keyframes spin{to{transform:rotate(360deg)}}
.cta-in{position:relative;z-index:2;max-width:640px;margin:0 auto}
.cta h2{font-family:var(--serif);font-weight:400;color:#fff;
  font-size:clamp(1.9rem,4.6vw,3.1rem);line-height:1.12;margin:14px 0 18px;letter-spacing:-.015em}
.cta p{color:rgba(255,255,255,.66);font-size:16px;line-height:1.75;margin:0 auto 32px;max-width:46ch}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn-light{background:#fff;color:var(--navy)}
.btn-light:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(255,255,255,.24)}
.btn-outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.28)}
.btn-outline:hover{border-color:var(--gold);color:var(--gold);transform:translateY(-2px)}

@media (prefers-reduced-motion:reduce){
  *{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important}
  [data-reveal]{opacity:1;transform:none}
}
/* ============================================================
   AJOUTS PAGE REACT (nav a deux boutons)
   ============================================================ */
.nav-actions{display:flex;gap:9px;align-items:center;flex:none}
@media(max-width:520px){
  .nav-actions{gap:6px}
  .nav-actions .btn{padding:10px 14px;font-size:13px}
}
@media(max-width:380px){
  .nav-actions .btn-ghost{display:none}
}
`;

function GlobalStyles() {
  return <style>{CSS}</style>;
}

/* ── NAV ─────────────────────────────────────────────────────── */
function Navbar() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 24);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={'nav' + (solid ? ' solid' : '')}>
      <div className="wrap nav-in">
        <Link to="/" className="brand">
          <span className="brand-mark"><span>RH</span></span>
          <span className="brand-txt">Le Resto-HUB<small>Management</small></span>
        </Link>

        <div className="nav-links">
          <a href="#flow">Fonctionnement</a>
          <a href="#fonctions">Fonctions</a>
          <a href="#livraison">Livraison</a>
          <a href="#roles">Rôles</a>
          <a href="#admin">Pilotage</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="btn btn-ghost">Se connecter</Link>
          <a className="btn btn-dark" href={WA_LINK} target="_blank" rel="noopener noreferrer">
            Demander une démo
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ── HERO ────────────────────────────────────────────────────── */
function HeroScreen() {
  const [cur, setCur] = useState(0);
  const [ready, setReady] = useState(false);

  /* Sur une connexion lente, avancer à intervalles fixes faisait défiler des
     écrans encore vides. On précharge les 5 écrans puis on ne lance la rotation
     qu'une fois qu'ils sont décodés — avec un garde-fou de 4 s pour ne jamais
     bloquer le diaporama si le réseau ne répond pas. */
  useEffect(() => {
    let done = 0;
    const finish = () => { done += 1; if (done === HERO_SLIDES.length) setReady(true); };
    const imgs = HERO_SLIDES.map((s) => {
      const img = new Image();
      img.onload = finish;
      img.onerror = finish;
      // srcset + sizes : le navigateur telecharge la bonne largeur des le prechargement
      img.sizes = HERO_SIZES;
      img.srcset = heroSrcSet(s.key);
      img.src = file(s.key, HERO_MAX, HERO_MAX);
      return img;
    });
    const bail = setTimeout(() => setReady(true), 4000);
    return () => {
      clearTimeout(bail);
      imgs.forEach((img) => { img.onload = null; img.onerror = null; });
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => setCur((c) => (c + 1) % HERO_SLIDES.length), 3800);
    return () => clearInterval(t);
  }, [ready]);

  const go = (i) => setCur(((i % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <div className="screen">
      {HERO_SLIDES.map((s, i) => (
        <div key={s.key} className={'slide' + (i === cur ? ' on' : '')} aria-hidden={i !== cur}>
          <img
            src={file(s.key, HERO_MAX, HERO_MAX)}
            srcSet={heroSrcSet(s.key)}
            sizes={HERO_SIZES}
            alt={`${s.label} — ${s.caption}`}
            width="768"
            height="1194"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : 'auto'}
          />
        </div>
      ))}
      <div className="screen-shade" />
      <div className="screen-cap">
        <em>{HERO_SLIDES[cur].label}</em>
        <b>{HERO_SLIDES[cur].caption}</b>
        <div className="dots">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.key}
              className={'dot' + (i === cur ? ' on' : '')}
              onClick={() => go(i)}
              aria-label={s.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero({ scrollY }) {
  return (
    <header className="hero">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="wrap hero-grid">

        <div>
          <div className="badge" data-reveal>
            <i><Store size={11} strokeWidth={2.4} color="#1F2A44" /></i>
            <span>Solution digitale pour restaurants</span>
          </div>

          <h1 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
            Votre restaurant,<br />
            <span className="underlined">
              simplement maîtrisé.
              <svg viewBox="0 0 600 24" preserveAspectRatio="none" aria-hidden="true">
                <path d="M6 16 C140 4, 300 20, 594 7" />
              </svg>
            </span>
          </h1>

          <p className="lede" data-reveal style={{ transitionDelay: '.12s' }}>
            Le Resto-HUB centralise les commandes, la cuisine, la réception, le menu
            et le suivi de votre établissement dans un seul espace unifié.
          </p>

          <div className="hero-cta" data-reveal style={{ transitionDelay: '.19s' }}>
            <a className="btn btn-dark" href={WA_LINK} target="_blank" rel="noopener noreferrer">
              Demander une démo
              <ArrowRight size={15} strokeWidth={2.2} />
            </a>
            <a className="btn btn-ghost" href="#flow">Voir comment ça marche</a>
          </div>

          <div className="hero-trust" data-reveal style={{ transitionDelay: '.26s' }}>
            <div><strong>15 min</strong><span>Mise en place</span></div>
            <div><strong>0 €</strong><span>Matériel requis</span></div>
            <div><strong>24/7</strong><span>Disponible</span></div>
          </div>
        </div>

        <div className="device-stage" data-reveal style={{ transitionDelay: '.1s' }}>
          <div className="device" style={{ '--py': `${(scrollY * -0.045).toFixed(1)}px` }}>
            <HeroScreen />
          </div>

          <div className="chip chip-1">
            <i style={{ background: 'rgba(52,211,153,.15)', color: '#059669' }}>
              <Check size={14} strokeWidth={2.3} />
            </i>
            <div><b>Commande reçue</b><span>Table 7 · à l&apos;instant</span></div>
          </div>

          <div className="chip chip-2">
            <i style={{ background: 'rgba(201,168,76,.18)', color: '#A8862F' }}>
              <TrendingUp size={14} strokeWidth={2.2} />
            </i>
            <div><b>+32 % de ventes</b><span>sur le mois en cours</span></div>
          </div>
        </div>

      </div>
    </header>
  );
}

/* ── MARQUEE ─────────────────────────────────────────────────── */
function Marquee() {
  const words = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        {words.map((w, i) => (
          <span key={i}>{w}<em>&#9670;</em></span>
        ))}
      </div>
    </div>
  );
}

/* ── STATS ───────────────────────────────────────────────────── */
function StatsBand() {
  return (
    <section className="stats">
      <div className="wrap">
        <div className="stats-grid">
          {STATS.map((s, i) => (
            <div className="stat" key={s.l} data-reveal style={{ transitionDelay: `${i * 0.07}s` }}>
              <s.Icon size={22} strokeWidth={1.7} color={GOLD} />
              <strong><AnimatedCounter target={s.v} suffix={s.s} /></strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FLOW (remplace l'ancien sommaire) ───────────────────────── */
function Flow() {
  const [ref, inView] = useInView(0.25);
  return (
    <section className="steps" id="flow">
      <div className="wrap">
        <div className="steps-head">
          <p className="eyebrow" data-reveal>Le parcours</p>
          <h2 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
            Trois gestes, et le service tourne.
          </h2>
          <p className="lede" data-reveal style={{ transitionDelay: '.1s' }}>
            Pas de formation, pas de matériel à installer. Votre équipe prend la main
            en quelques minutes.
          </p>
        </div>

        <div className={'flow' + (inView ? ' drawn' : '')} ref={ref}>
          {STEPS.map((s, i) => (
            <div className="step" key={s.n} data-reveal style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="step-n"><b>{s.n}</b></div>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FONCTIONS (bento) ───────────────────────────────────────── */
function Features() {
  return (
    <section className="bento" id="fonctions">
      <div className="wrap">
        <div className="bento-head">
          <div>
            <p className="eyebrow" data-reveal>Tout est inclus</p>
            <h2 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
              Un seul outil, tout le service.
            </h2>
          </div>
          <p className="lede" data-reveal style={{ transitionDelay: '.1s', margin: 0, maxWidth: '34ch' }}>
            Du menu au suivi de salle : l&apos;essentiel, sans le superflu.
          </p>
        </div>

        <div className="bento-grid">
          {CARDS.map((c, i) => (
            <article className={'card ' + c.cls} key={c.t} data-reveal
              style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className="ph">
                <img src={file(c.key, CARD_MAX, CARD_MAX)} srcSet={cardSrcSet(c.key)}
                  sizes={c.cls === 'w-2' ? '(min-width:940px) 365px, (min-width:600px) 45vw, calc(100vw - 48px)' : '(min-width:940px) 560px, (min-width:600px) 45vw, calc(100vw - 48px)'}
                  alt={c.t} width="1100" height="684" loading="lazy" decoding="async" />
              </div>
              <div className="body">
                <div className="head">
                  <span className="ico"><c.Icon size={17} strokeWidth={2} /></span>
                  <h3>{c.t}</h3>
                </div>
                <p>{c.p}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── LIVRAISON & STOCK ───────────────────────────────────────── */
function Delivery() {
  return (
    <section className="deliv" id="livraison">
      <div className="wrap">
        <div className="deliv-head">
          <div>
            <p className="eyebrow" data-reveal>Livraison &amp; stock</p>
            <h2 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
              De la réserve jusqu&apos;à la porte du client.
            </h2>
          </div>
          <p className="lede" data-reveal style={{ transitionDelay: '.1s', margin: 0, maxWidth: '34ch' }}>
            Vos quantités, la préparation et la course du livreur, suivies dans le même outil.
          </p>
        </div>

        <div className="deliv-grid">
          {DELIV.map((d, i) => (
            <article className={'dcard ' + (d.cls || '')} key={d.t} data-reveal
              style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="ph">
                <img src={file(d.key, CARD_MAX, CARD_MAX)} srcSet={cardSrcSet(d.key)}
                  sizes="(min-width:640px) 365px, calc(100vw - 48px)"
                  alt={d.t} width="1100" height="684" loading="lazy" decoding="async" />
              </div>
              <div className="body">
                <div className="head">
                  <span className="ico"><d.Icon size={17} strokeWidth={2} /></span>
                  <h3>{d.t}</h3>
                </div>
                <p>{d.p}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="deliv-note" data-reveal>
          Le rôle Livreur s&apos;active à la demande, pour les établissements qui assurent
          eux-mêmes leurs livraisons.
        </p>
      </div>
    </section>
  );
}

/* ── RÔLES ───────────────────────────────────────────────────── */
function Roles() {
  return (
    <section className="roles" id="roles">
      <div className="wrap">
        <div style={{ maxWidth: 600 }}>
          <p className="eyebrow" data-reveal>Votre équipe</p>
          <h2 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
            Chacun voit ce qui le concerne.
          </h2>
          <p className="lede" data-reveal style={{ transitionDelay: '.1s' }}>
            Quatre rôles, quatre écrans. La cuisine ne voit pas vos chiffres,
            la réception ne touche pas à la carte.
          </p>
        </div>

        <div className="roles-grid">
          {ROLES.map((r, i) => (
            <div className="role" key={r.t} style={{ '--accent': r.c, transitionDelay: `${i * 0.08}s` }} data-reveal>
              <i><r.Icon size={21} strokeWidth={2} /></i>
              <h4>{r.t}</h4>
              <p>{r.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PILOTAGE (admin) ────────────────────────────────────────── */
function Admin() {
  return (
    <section className="admin" id="admin">
      <div className="orb orb-3" />
      <div className="wrap">
        <div style={{ maxWidth: 600 }}>
          <p className="eyebrow" data-reveal>Pilotage</p>
          <h2 className="display" data-reveal style={{ transitionDelay: '.05s' }}>
            Un poste de commandement,<br />pas une usine à gaz.
          </h2>
          <p className="lede" data-reveal style={{ transitionDelay: '.1s' }}>
            Gérez. Suivez. Pilotez. Tout ce qu&apos;un directeur doit voir, et rien de plus.
          </p>
        </div>

        <div className="admin-grid">
          <div className="mock" data-reveal>
            <div className="mock-bar">
              <span /><span /><span />
              <span className="mock-title">Tableau de bord</span>
            </div>
            <div className="mock-stats">
              <div className="tile"><b>24</b><span>Commandes</span></div>
              <div className="tile"><b>3</b><span>En attente</span></div>
              <div className="tile"><b>16</b><span>Servies</span></div>
            </div>
            <div className="chart">
              {BARS.map((h, i) => (
                <div key={i} style={{ height: `${h}%`, animationDelay: `${0.5 + i * 0.07}s` }} />
              ))}
            </div>
            <div className="mock-rows">
              <div className="row-live"><span className="pulse" />Table 4<em>En préparation</em></div>
              <div className="row-live"><span className="pulse" style={{ background: GOLD }} />Table 7<em>Nouvelle</em></div>
              <div className="row-live"><span className="pulse" style={{ background: 'rgba(255,255,255,.3)' }} />Table 2<em>Prête</em></div>
            </div>
          </div>

          <div className="admin-list">
            {ADMIN_FEATS.map((f, i) => (
              <div className="af" key={f.t} style={{ '--accent': f.c, transitionDelay: `${i * 0.06}s` }} data-reveal>
                <f.Icon size={20} strokeWidth={2} />
                <b>{f.t}</b>
                <span>{f.p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA FINAL (pas de footer) ───────────────────────────────── */
function CtaFinal() {
  return (
    <section className="cta">
      <div className="wrap">
        <div className="cta-box" data-reveal>
          <div className="aurora" />
          <div className="cta-in">
            <p className="eyebrow" style={{ color: GOLD }}>Prêt en 15 minutes</p>
            <h2>Testez sur votre salle,<br />sans engagement.</h2>
            <p>
              On installe, on forme votre équipe, et vous jugez sur un service
              complet. Aucun matériel à acheter.
            </p>
            <div className="cta-btns">
              <a className="btn btn-gold" href={WA_LINK} target="_blank" rel="noopener noreferrer">
                Démarrer l&apos;essai
                <ArrowRight size={15} strokeWidth={2.2} />
              </a>
              <a className="btn btn-outline" href="#flow">Voir le fonctionnement</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PAGE ────────────────────────────────────────────────────── */
export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const rootRef = useRef(null);

  /* Déclenche les animations d'entrée (trait doré du titre) après le montage.
     On touche directement au DOM plutôt que de passer par un état : cela évite
     un rendu supplémentaire juste pour poser une classe. */
  useEffect(() => { rootRef.current?.classList.add('loaded'); }, []);

  useEffect(() => {
    let raf = null;
    const fn = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { setScrollY(window.scrollY); raf = null; });
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => { window.removeEventListener('scroll', fn); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useReveal();

  return (
    <div ref={rootRef}>
      <GlobalStyles />
      <Navbar />
      <Hero scrollY={scrollY} />
      <Marquee />
      <StatsBand />
      <Flow />
      <Features />
      <Delivery />
      <Roles />
      <Admin />
      <CtaFinal />
    </div>
  );
}
