import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Mail,
  Store,
  Users,
  ChefHat,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Clock,
  Zap,
  Globe,
  Lock,
  Settings2,
  PieChart,
  Bell,
  Layers,
} from "lucide-react";

const NAVY  = "#1F2A44";
const GOLD  = "#C9A84C";
const CREAM = "#F7F3EB";

const IMAGES = {
  hero:          "/images/restaurant.webp",
  espaceIsole:   "/images/guide-espace-isole.jpg",
  inviterEquipe: "/images/guide-inviter-equipe1.jpg",
  menu:          "/images/guide-menu1.png",
  qrCommande:    "/images/guide-qr-commande.jpg",
  dashboard:     "/images/guide-dashboard.webp",
};

// ── Hooks ──────────────────────────────────────────────────────
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.15, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function AnimatedCounter({ target, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ── Data ──────────────────────────────────────────────────────
const guideCards = [
  { image: IMAGES.espaceIsole,   icon: ShieldCheck,    title: "Un espace par restaurant",       description: "Chaque etablissement dispose de son propre espace, totalement isole des autres. Vos donnees restent propres a votre restaurant." },
  { image: IMAGES.inviterEquipe, icon: Users,          title: "Inviter votre equipe",           description: "Invitez facilement votre reception ou votre cuisine. Chaque membre dispose des acces adaptes a son role." },
  { image: IMAGES.menu,          icon: UtensilsCrossed,title: "Gerer votre menu",               description: "Ajoutez vos plats, organisez vos categories, modifiez les prix et controlez la disponibilite en quelques clics." },
  { image: IMAGES.qrCommande,    icon: QrCode,         title: "Commande en salle par QR code",  description: "Vos clients scannent le QR code de leur table et commandent directement depuis leur telephone." },
  { image: IMAGES.dashboard,     icon: BarChart3,      title: "Suivi et tableau de bord",       description: "Suivez l activite de votre restaurant, vos commandes et vos performances depuis un espace centralise." },
];

const adminFeatures = [
  { icon: Globe,    title: "Multi-etablissements",          description: "Gerez plusieurs restaurants depuis un seul compte super-admin. Vue globale unifiee.",                                    color: "#3B82F6" },
  { icon: Lock,     title: "Acces securise par invitation",  description: "Aucun compte public. Chaque acces est valide manuellement. Securite totale de vos donnees.",                            color: "#10B981" },
  { icon: Settings2,title: "Gestion des abonnements",       description: "Suivez les abonnements actifs, les renouvellements et les statuts de paiement de chaque restaurant.",                   color: "#C9A84C" },
  { icon: PieChart, title: "Analytiques avancees",          description: "Visualisez les revenus, les commandes, et les performances de chaque etablissement en temps reel.",                     color: "#EC4899" },
  { icon: Bell,     title: "Alertes & Notifications",       description: "Soyez notifie des nouvelles commandes, des commandes urgentes et des evenements critiques.",                             color: "#F97316" },
  { icon: Layers,   title: "Architecture multi-roles",      description: "Super Admin, Admin restaurant, Reception, Cuisine - chaque role a ses propres acces et interfaces.",                     color: "#8B5CF6" },
];

const kpis = [
  { label: "Temps de mise en place", value: 15,  suffix: "min", icon: Clock      },
  { label: "Commandes / jour",       value: 200, suffix: "+",   icon: TrendingUp },
  { label: "Reduction des erreurs",  value: 90,  suffix: "%",   icon: Zap        },
  { label: "Restaurants geres",      value: 12,  suffix: "+",   icon: Store      },
];

// ── Main ──────────────────────────────────────────────────────
export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", backgroundColor: CREAM, color: NAVY }}>
      <GlobalStyles />
      <Navbar />
      <HeroSection scrollY={scrollY} />
      <StatsBand />
      <IntroSection />
      <FeaturesSection />
      <RolesSection />
      <AdminSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ── GlobalStyles ──────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .reveal { opacity:0; transform:translateY(30px); transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1); }
      .reveal.visible { opacity:1; transform:translateY(0); }
      .reveal-left  { opacity:0; transform:translateX(-40px); transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1); }
      .reveal-left.visible  { opacity:1; transform:translateX(0); }
      .reveal-right { opacity:0; transform:translateX( 40px); transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1); }
      .reveal-right.visible { opacity:1; transform:translateX(0); }
      .delay-1{transition-delay:.10s!important} .delay-2{transition-delay:.20s!important}
      .delay-3{transition-delay:.30s!important} .delay-4{transition-delay:.40s!important}
      .delay-5{transition-delay:.50s!important} .delay-6{transition-delay:.60s!important}
      @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      .float { animation:floatBadge 3s ease-in-out infinite; }
      @keyframes pulseDot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }
      .pulse-dot { animation:pulseDot 1.6s ease-in-out infinite; }
      @keyframes livePing  { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
      .live-ping { animation:livePing 1.4s cubic-bezier(0,0,.2,1) infinite; }
      .card-lift { transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s cubic-bezier(.16,1,.3,1); }
      .card-lift:hover { transform:translateY(-6px); box-shadow:0 24px 56px -12px rgba(31,42,68,.15); }
      .img-zoom img { transition:transform .6s cubic-bezier(.16,1,.3,1); }
      .img-zoom:hover img { transform:scale(1.05); }
      .gold-text { background:linear-gradient(135deg,#C9A84C,#E8C46A,#C9A84C); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .section-sep { width:48px; height:3px; background:linear-gradient(90deg,#C9A84C,transparent); border-radius:2px; margin-bottom:20px; }
    `}</style>
  );
}

// ── Navbar ────────────────────────────────────────────────────
function Navbar() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav style={{ position:"sticky", top:0, zIndex:100, backgroundColor:solid?"rgba(247,243,235,.92)":"transparent", backdropFilter:solid?"blur(14px)":"none", borderBottom:solid?"1px solid rgba(201,168,76,.15)":"1px solid transparent", transition:"all .4s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", height:72, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:12, textDecoration:"none" }}>
          <div style={{ width:40, height:40, borderRadius:12, backgroundColor:NAVY, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(31,42,68,.25)" }}>
            <Store size={18} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:17, color:NAVY, lineHeight:1 }}>Le Resto-HUB</div>
            <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"#999", marginTop:3 }}>Restaurant Management</div>
          </div>
        </Link>
        <div style={{ display:"flex", gap:10 }}>
          <Link to="/login"
            style={{ fontFamily:"Outfit,sans-serif", fontSize:14, fontWeight:500, padding:"9px 20px", borderRadius:11, border:"1.5px solid "+NAVY, color:NAVY, textDecoration:"none", transition:"all .25s" }}
            onMouseEnter={e=>{e.currentTarget.style.backgroundColor=NAVY;e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.backgroundColor="transparent";e.currentTarget.style.color=NAVY;}}>
            Se connecter
          </Link>
          <a href="https://wa.me/242065991104" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:"Outfit,sans-serif", fontSize:14, fontWeight:600, padding:"9px 20px", borderRadius:11, backgroundColor:GOLD, color:"#fff", textDecoration:"none", boxShadow:"0 4px 16px rgba(201,168,76,.35)", transition:"all .25s" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(201,168,76,.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 16px rgba(201,168,76,.35)";}}>
            Nous contacter
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────
function HeroSection({ scrollY }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  const fi = (d=0) => ({ opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(24px)", transition:`opacity .8s cubic-bezier(.16,1,.3,1) ${d}s,transform .8s cubic-bezier(.16,1,.3,1) ${d}s` });

  return (
    <header style={{ maxWidth:1200, margin:"0 auto", padding:"60px 24px 80px", position:"relative" }}>
      <div style={{ position:"absolute", top:-60, right:-80, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(201,168,76,.12) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:56, alignItems:"center" }}>

        <div>
          {/* Live badge */}
          <div style={{ ...fi(0), display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:99, backgroundColor:"#fff", border:"1.5px solid rgba(201,168,76,.3)", marginBottom:28, boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
            <span style={{ position:"relative", width:8, height:8, display:"inline-block" }}>
              <span className="live-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", backgroundColor:"#22C55E", display:"block" }} />
              <span style={{ position:"absolute", inset:0, borderRadius:"50%", backgroundColor:"#22C55E", display:"block" }} />
            </span>
            <span style={{ fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:600, color:NAVY, letterSpacing:".04em" }}>Solution digitale pour restaurants</span>
          </div>

          {/* Heading */}
          <h1 style={{ ...fi(.1), fontFamily:"Georgia,serif", fontSize:"clamp(2.4rem,5vw,3.8rem)", fontWeight:"normal", color:NAVY, lineHeight:1.08, marginBottom:24 }}>
            Votre restaurant,<br />
            <span style={{ position:"relative", display:"inline-block" }}>
              <span className="gold-text">simplement maitrise.</span>
              <svg style={{ position:"absolute", bottom:-8, left:0, width:"100%", height:12 }} viewBox="0 0 300 12" fill="none">
                <path d="M2 8 Q75 2 150 8 Q225 14 298 6" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" fill="none"
                  style={{ strokeDasharray:320, strokeDashoffset:mounted?0:320, transition:"stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1) .7s" }} />
              </svg>
            </span>
          </h1>

          <p style={{ ...fi(.18), fontFamily:"Outfit,sans-serif", fontSize:17, color:"#666", lineHeight:1.75, marginBottom:36, maxWidth:480 }}>
            Le Resto-HUB centralise les commandes, la cuisine, la reception, le menu et le suivi de votre etablissement dans un seul espace unifie.
          </p>

          <div style={{ ...fi(.26), display:"flex", gap:12, flexWrap:"wrap", marginBottom:32 }}>
            <a href="https://wa.me/242065991104" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"14px 28px", borderRadius:14, backgroundColor:NAVY, color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:15, fontWeight:600, textDecoration:"none", boxShadow:"0 8px 24px rgba(31,42,68,.28)", transition:"all .3s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 16px 40px rgba(31,42,68,.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 24px rgba(31,42,68,.28)";}}>
              Nous contacter <ArrowRight size={16} strokeWidth={2} />
            </a>
            <Link to="/login"
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"14px 28px", borderRadius:14, backgroundColor:"#fff", color:NAVY, fontFamily:"Outfit,sans-serif", fontSize:15, fontWeight:500, textDecoration:"none", border:"1.5px solid #e5e5e5", transition:"all .3s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.boxShadow="0 4px 16px rgba(201,168,76,.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e5e5";e.currentTarget.style.boxShadow="none";}}>
              Acceder a mon espace
            </Link>
          </div>

          <div style={{ ...fi(.34), display:"flex", gap:20, flexWrap:"wrap" }}>
            {["Simple a utiliser","Acces securise","Pense pour l'Afrique"].map(t => (
              <div key={t} style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"Outfit,sans-serif", fontSize:13, color:"#777" }}>
                <CheckCircle2 size={15} color={GOLD} strokeWidth={2} />{t}
              </div>
            ))}
          </div>
        </div>

        {/* Image */}
        <div style={{ ...fi(.2), position:"relative" }}>
          <div style={{ position:"absolute", inset:-20, borderRadius:40, background:"radial-gradient(ellipse,rgba(201,168,76,.2) 0%,transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"relative", backgroundColor:"#fff", padding:10, borderRadius:28, boxShadow:"0 32px 80px -20px rgba(31,42,68,.22),0 0 0 1px rgba(201,168,76,.12)" }}>
            <div style={{ overflow:"hidden", borderRadius:20, backgroundColor:"#f5f5f5" }}>
              <img src={IMAGES.hero} alt="Salle de restaurant" style={{ width:"100%", height:"auto", display:"block", objectFit:"cover", transform:`translateY(${scrollY*.08}px)`, transition:"transform .1s linear" }} />
            </div>
            <div className="float" style={{ position:"absolute", bottom:-18, left:-18, backgroundColor:"#fff", borderRadius:18, padding:"14px 18px", boxShadow:"0 8px 32px rgba(31,42,68,.16)", border:"1px solid rgba(201,168,76,.15)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:12, backgroundColor:CREAM, display:"flex", alignItems:"center", justifyContent:"center" }}><QrCode size={18} color={NAVY} strokeWidth={1.5} /></div>
                <div>
                  <div style={{ fontFamily:"Outfit,sans-serif", fontSize:11, color:"#999" }}>Commande digitale</div>
                  <div style={{ fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:700, color:NAVY }}>Simple & rapide</div>
                </div>
              </div>
            </div>
            <div className="float" style={{ position:"absolute", top:-14, right:-14, backgroundColor:NAVY, borderRadius:16, padding:"10px 16px", boxShadow:"0 8px 24px rgba(31,42,68,.3)", animationDelay:"1.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ position:"relative", display:"inline-flex" }}>
                  <span className="live-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", backgroundColor:"#22C55E" }} />
                  <span style={{ width:8, height:8, borderRadius:"50%", backgroundColor:"#22C55E", display:"block", position:"relative" }} />
                </span>
                <span style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:600, color:"#fff" }}>En direct</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

// ── Stats Band ────────────────────────────────────────────────
function StatsBand() {
  const ref = useReveal();
  return (
    <section style={{ backgroundColor:NAVY, padding:"40px 24px" }}>
      <div ref={ref} className="reveal" style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))" }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`delay-${i+1}`} style={{ textAlign:"center", padding:"24px 16px", borderRight:i<kpis.length-1?"1px solid rgba(255,255,255,.08)":"none" }}>
              <Icon size={20} color={GOLD} strokeWidth={1.5} style={{ marginBottom:8 }} />
              <div style={{ fontFamily:"Georgia,serif", fontSize:"2.2rem", color:"#fff", lineHeight:1 }}>
                <AnimatedCounter target={kpi.value} suffix={kpi.suffix} />
              </div>
              <div style={{ fontFamily:"Outfit,sans-serif", fontSize:12, color:"rgba(255,255,255,.5)", marginTop:6, letterSpacing:".04em" }}>{kpi.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Intro ─────────────────────────────────────────────────────
function IntroSection() {
  const ref = useReveal();
  return (
    <section style={{ backgroundColor:"#fff", borderTop:"1px solid #f0ede6", borderBottom:"1px solid #f0ede6" }}>
      <div ref={ref} className="reveal" style={{ maxWidth:860, margin:"0 auto", padding:"80px 24px", textAlign:"center" }}>
        <div className="section-sep" style={{ margin:"0 auto 20px" }} />
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:GOLD, marginBottom:16 }}>Une seule plateforme</p>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.8rem,3.5vw,2.8rem)", fontWeight:"normal", color:NAVY, marginBottom:20, lineHeight:1.25 }}>Tout votre restaurant, au meme endroit.</h2>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:16, color:"#888", lineHeight:1.8, maxWidth:600, margin:"0 auto" }}>
          Plus besoin de jongler entre plusieurs outils. Le Resto-HUB connecte les differents acteurs de votre restaurant autour d'un meme systeme en temps reel.
        </p>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────
function FeaturesSection() {
  const titleRef = useReveal();
  return (
    <section style={{ maxWidth:1200, margin:"0 auto", padding:"100px 24px" }}>
      <div ref={titleRef} className="reveal" style={{ maxWidth:560, marginBottom:60 }}>
        <div className="section-sep" />
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:GOLD, marginBottom:14 }}>Fonctionnalites</p>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.8rem,3vw,2.6rem)", fontWeight:"normal", color:NAVY, lineHeight:1.25, marginBottom:14 }}>Une gestion pensee<br />pour votre quotidien.</h2>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:15, color:"#888", lineHeight:1.75 }}>Chaque fonctionnalite repond a un besoin concret du restaurant, de la gestion interne jusqu'a l'experience du client.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
        {guideCards.map((card, index) => <FeatureCard key={card.title} card={card} index={index} isWide={index===0} />)}
      </div>
    </section>
  );
}

function FeatureCard({ card, index, isWide }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold:0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const Icon = card.icon;
  return (
    <article ref={ref} className={`reveal card-lift delay-${Math.min(index+1,5)}`}
      style={{ gridColumn:isWide?"span 2":"span 1", backgroundColor:"#fff", borderRadius:24, overflow:"hidden", border:"1px solid #f0ede6", boxShadow:"0 2px 16px rgba(31,42,68,.06)" }}>
      <div style={{ display:"grid", gridTemplateColumns:isWide?"1fr 1fr":"1fr", height:isWide?360:"auto" }}>
        <div className="img-zoom" style={{ overflow:"hidden", backgroundColor:"#f8f6f1", display:"flex", alignItems:"center", justifyContent:"center", minHeight:isWide?"100%":220 }}>
          <img src={card.image} alt={card.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        </div>
        <div style={{ padding:36 }}>
          <div style={{ width:44, height:44, borderRadius:14, backgroundColor:CREAM, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <Icon size={20} color={NAVY} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:"normal", color:NAVY, marginBottom:12, lineHeight:1.3 }}>{card.title}</h3>
          <p style={{ fontFamily:"Outfit,sans-serif", fontSize:14, color:"#888", lineHeight:1.75 }}>{card.description}</p>
        </div>
      </div>
    </article>
  );
}

// ── Roles ─────────────────────────────────────────────────────
function RolesSection() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  useEffect(() => {
    [[leftRef,"reveal-left"],[rightRef,"reveal-right"]].forEach(([r,cls]) => {
      const el = r.current; if (!el) return;
      el.classList.add(cls);
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold:0.12 });
      obs.observe(el); return () => obs.disconnect();
    });
  }, []);
  return (
    <section style={{ backgroundColor:"#fff", borderTop:"1px solid #f0ede6", borderBottom:"1px solid #f0ede6" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"100px 24px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:64, alignItems:"center" }}>
          <div ref={leftRef}>
            <div className="section-sep" />
            <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:GOLD, marginBottom:14 }}>Une equipe connectee</p>
            <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.8rem,3vw,2.6rem)", fontWeight:"normal", color:NAVY, lineHeight:1.25, marginBottom:16 }}>Chacun son role.<br />Un seul systeme.</h2>
            <p style={{ fontFamily:"Outfit,sans-serif", fontSize:15, color:"#888", lineHeight:1.75, marginBottom:36 }}>Proprietaire, reception et cuisine travaillent ensemble avec des acces adaptes a leurs responsabilites.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <RoleItem icon={Store}   title="Proprietaire" text="Supervise l activite, la gestion et les performances du restaurant." accentColor={GOLD}       />
              <RoleItem icon={Users}   title="Reception"    text="Gere les commandes, la communication et la relation avec les clients." accentColor="#3B82F6" />
              <RoleItem icon={ChefHat} title="Cuisine"      text="Recoit les commandes en temps reel et suit leur preparation."          accentColor="#10B981" />
            </div>
          </div>
          <div ref={rightRef}>
            <div style={{ backgroundColor:CREAM, borderRadius:28, padding:28 }}>
              <div style={{ backgroundColor:"#fff", borderRadius:20, padding:28, boxShadow:"0 8px 32px rgba(31,42,68,.08)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
                  <div>
                    <p style={{ fontFamily:"Outfit,sans-serif", fontSize:11, color:"#bbb", marginBottom:4, letterSpacing:".06em", textTransform:"uppercase" }}>Tableau de bord</p>
                    <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, color:NAVY }}>Votre restaurant</h3>
                  </div>
                  <BarChart3 size={22} color={GOLD} strokeWidth={1.5} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <DashboardStat label="Commandes"      value="24"   trend="+12%" />
                  <DashboardStat label="En cuisine"     value="08"   trend="live" />
                  <DashboardStat label="Tables"         value="16"   trend="+2"   />
                  <DashboardStat label="Chiffre du jour" value="128K" trend="+18%"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Admin Section ─────────────────────────────────────────────
function AdminSection() {
  const titleRef = useReveal();
  return (
    <section style={{ maxWidth:1200, margin:"0 auto", padding:"100px 24px" }}>
      <div ref={titleRef} className="reveal" style={{ textAlign:"center", maxWidth:700, margin:"0 auto 70px" }}>
        <div className="section-sep" style={{ margin:"0 auto 20px" }} />
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:GOLD, marginBottom:14 }}>Espace Admin - Valeur Ajoutee</p>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.8rem,3.5vw,2.8rem)", fontWeight:"normal", color:NAVY, marginBottom:18, lineHeight:1.25 }}>
          Pilotez votre reseau de restaurants<br /><span className="gold-text">depuis un seul tableau de bord.</span>
        </h2>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:16, color:"#888", lineHeight:1.8 }}>
          L'interface Super Admin offre une vue centralisee et des outils puissants pour gerer chaque etablissement, chaque equipe et chaque abonnement en toute simplicite.
        </p>
      </div>
      <AdminShowcase />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20, marginTop:56 }}>
        {adminFeatures.map((feat, i) => <AdminFeatureCard key={feat.title} feat={feat} delay={i} />)}
      </div>
      <div style={{ textAlign:"center", marginTop:56 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"18px 32px", borderRadius:16, backgroundColor:NAVY, color:"#fff", boxShadow:"0 12px 40px rgba(31,42,68,.25)", flexWrap:"wrap", justifyContent:"center" }}>
          <ShieldCheck size={20} color={GOLD} strokeWidth={1.5} />
          <span style={{ fontFamily:"Outfit,sans-serif", fontSize:14, fontWeight:500 }}>Acces Super Admin sur demande</span>
          <a href="https://wa.me/242065991104" target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:6, fontFamily:"Outfit,sans-serif", fontSize:13, fontWeight:700, color:GOLD, textDecoration:"none", padding:"6px 14px", borderRadius:10, backgroundColor:"rgba(201,168,76,.15)" }}>
            WhatsApp <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminShowcase() {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal" style={{ borderRadius:28, overflow:"hidden", border:"2px solid rgba(201,168,76,.2)", boxShadow:"0 32px 80px -20px rgba(31,42,68,.2)" }}>
      <div style={{ backgroundColor:NAVY, padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ display:"flex", gap:7 }}>
          {["#EF4444","#F59E0B","#10B981"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", backgroundColor:c, opacity:.7 }} />)}
        </div>
        <div style={{ flex:1, height:26, borderRadius:8, backgroundColor:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", paddingLeft:12 }}>
          <span style={{ fontFamily:"Outfit,sans-serif", fontSize:11, color:"rgba(255,255,255,.4)" }}>app.resto-hub.com/super-admin</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:8, backgroundColor:"rgba(34,197,94,.15)" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", backgroundColor:"#22C55E" }} />
          <span style={{ fontFamily:"Outfit,sans-serif", fontSize:11, color:"#22C55E", fontWeight:600 }}>Securise</span>
        </div>
      </div>
      <div style={{ position:"relative", backgroundColor:"#0f1624" }}>
        <img src={IMAGES.dashboard} alt="Tableau de bord super admin" style={{ width:"100%", height:"auto", display:"block", objectFit:"cover", maxHeight:480 }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(31,42,68,.75) 0%,transparent 55%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:24, left:24, right:24, display:"flex", gap:14, flexWrap:"wrap" }}>
          {[{label:"Restaurants actifs",value:"12",color:"#22C55E"},{label:"Revenus ce mois",value:"4.2M FCFA",color:GOLD},{label:"Commandes traitees",value:"1 847",color:"#3B82F6"}].map(s => (
            <div key={s.label} style={{ backgroundColor:"rgba(255,255,255,.1)", backdropFilter:"blur(12px)", borderRadius:14, padding:"12px 20px", border:"1px solid rgba(255,255,255,.15)", flex:"1 1 140px" }}>
              <div style={{ fontFamily:"Outfit,sans-serif", fontSize:10, color:"rgba(255,255,255,.6)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:22, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminFeatureCard({ feat, delay }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold:0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const Icon = feat.icon;
  return (
    <div ref={ref} className={`reveal delay-${Math.min(delay+1,6)}`}
      style={{ backgroundColor:"#fff", borderRadius:20, padding:28, border:"1px solid #f0ede6", boxShadow:"0 2px 12px rgba(31,42,68,.05)", transition:"all .3s ease", cursor:"default" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 20px 48px rgba(31,42,68,.12)";e.currentTarget.style.borderColor=feat.color+"40";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 12px rgba(31,42,68,.05)";e.currentTarget.style.borderColor="#f0ede6";}}>
      <div style={{ width:48, height:48, borderRadius:14, backgroundColor:feat.color+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
        <Icon size={22} color={feat.color} strokeWidth={1.5} />
      </div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:"normal", color:NAVY, marginBottom:10, lineHeight:1.3 }}>{feat.title}</h3>
      <p style={{ fontFamily:"Outfit,sans-serif", fontSize:14, color:"#888", lineHeight:1.75 }}>{feat.description}</p>
    </div>
  );
}

// ── CTA ───────────────────────────────────────────────────────
function CTASection() {
  const ref = useReveal();
  return (
    <section style={{ padding:"40px 24px 100px" }}>
      <div ref={ref} className="reveal" style={{ maxWidth:1000, margin:"0 auto", position:"relative", overflow:"hidden", borderRadius:32, backgroundColor:NAVY, padding:"80px 40px", textAlign:"center", boxShadow:"0 40px 100px -20px rgba(31,42,68,.4)" }}>
        <div style={{ position:"absolute", top:-80, right:-80, width:280, height:280, borderRadius:"50%", backgroundColor:GOLD, opacity:.08, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-100, left:-60, width:320, height:320, borderRadius:"50%", backgroundColor:GOLD, opacity:.06, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:2, background:"linear-gradient(90deg,transparent,"+GOLD+",transparent)" }} />
        <div style={{ position:"relative" }}>
          <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:GOLD, marginBottom:18 }}>Le Resto-HUB</p>
          <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(2rem,4vw,3rem)", fontWeight:"normal", color:"#fff", marginBottom:18, lineHeight:1.2 }}>Pret a moderniser<br />votre restaurant ?</h2>
          <p style={{ fontFamily:"Outfit,sans-serif", fontSize:16, color:"rgba(255,255,255,.55)", maxWidth:480, margin:"0 auto 40px", lineHeight:1.75 }}>
            L'acces se fait sur invitation. Contactez-nous pour mettre en place votre espace restaurant en moins de 15 minutes.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <a href="https://wa.me/242065991104" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"16px 32px", borderRadius:16, backgroundColor:"#fff", color:NAVY, fontFamily:"Outfit,sans-serif", fontSize:15, fontWeight:700, textDecoration:"none", boxShadow:"0 8px 32px rgba(0,0,0,.2)", transition:"all .3s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 16px 48px rgba(0,0,0,.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,.2)";}}>
              <MessageCircle size={18} strokeWidth={1.5} />WhatsApp
            </a>
            <a href="mailto:jesusnetng@gmail.com"
              style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"16px 32px", borderRadius:16, backgroundColor:"transparent", color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:15, fontWeight:500, textDecoration:"none", border:"1.5px solid rgba(255,255,255,.2)", transition:"all .3s" }}
              onMouseEnter={e=>{e.currentTarget.style.backgroundColor="rgba(255,255,255,.08)";e.currentTarget.style.borderColor="rgba(255,255,255,.4)";}}
              onMouseLeave={e=>{e.currentTarget.style.backgroundColor="transparent";e.currentTarget.style.borderColor="rgba(255,255,255,.2)";}}>
              <Mail size={18} strokeWidth={1.5} />Email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop:"1px solid #ebe8e0" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, backgroundColor:NAVY, display:"flex", alignItems:"center", justifyContent:"center" }}><Store size={16} color="#fff" strokeWidth={1.5} /></div>
          <span style={{ fontFamily:"Georgia,serif", fontSize:15, color:NAVY }}>Le Resto-HUB</span>
        </div>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:12, color:"#bbb" }}>c {new Date().getFullYear()} Le Resto-HUB - Brazzaville, Congo</p>
      </div>
    </footer>
  );
}

// ── Shared sub-components ─────────────────────────────────────
function RoleItem({ icon: Icon, title, text, accentColor }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:16, padding:16, borderRadius:16, backgroundColor:"#fff", border:"1px solid #f0ede6", boxShadow:"0 2px 8px rgba(31,42,68,.04)", transition:"all .25s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor+"60";e.currentTarget.style.boxShadow="0 8px 24px "+accentColor+"15";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#f0ede6";e.currentTarget.style.boxShadow="0 2px 8px rgba(31,42,68,.04)";}}>
      <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:accentColor+"15" }}>
        <Icon size={20} color={accentColor} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ fontFamily:"Outfit,sans-serif", fontSize:15, fontWeight:600, color:NAVY, marginBottom:4 }}>{title}</h3>
        <p style={{ fontFamily:"Outfit,sans-serif", fontSize:13, color:"#888", lineHeight:1.6 }}>{text}</p>
      </div>
    </div>
  );
}

function DashboardStat({ label, value, trend }) {
  const isLive = trend === "live";
  return (
    <div style={{ borderRadius:16, backgroundColor:"#f8f6f1", padding:"18px 16px" }}>
      <p style={{ fontFamily:"Outfit,sans-serif", fontSize:10, color:"#bbb", marginBottom:6, letterSpacing:".06em", textTransform:"uppercase" }}>{label}</p>
      <p style={{ fontFamily:"Georgia,serif", fontSize:26, color:NAVY, lineHeight:1 }}>{value}</p>
      <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:8, backgroundColor:isLive?"rgba(34,197,94,.1)":"rgba(201,168,76,.1)" }}>
        {isLive && <div className="pulse-dot" style={{ width:6, height:6, borderRadius:"50%", backgroundColor:"#22C55E" }} />}
        <span style={{ fontFamily:"Outfit,sans-serif", fontSize:11, fontWeight:600, color:isLive?"#22C55E":GOLD }}>{trend}</span>
      </div>
    </div>
  );
}
