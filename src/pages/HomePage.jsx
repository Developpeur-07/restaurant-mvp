import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight, CheckCircle2, MessageCircle, Mail, Store, Users, ChefHat,
  UtensilsCrossed, QrCode, BarChart3, ShieldCheck, TrendingUp, Clock,
  Zap, Globe, Lock, Settings2, PieChart, Bell, Layers,
} from 'lucide-react';

const NAVY  = '#1F2A44';
const GOLD  = '#C9A84C';
const CREAM = '#F7F3EB';

const IMAGES = {
  hero:          '/images/restaurant.webp',
  espaceIsole:   '/images/guide-espace-isole.jpg',
  inviterEquipe: '/images/guide-inviter-equipe1.jpg',
  menu:          '/images/guide-menu1.png',
  qrCommande:    '/images/guide-qr-commande.jpg',
  dashboard:     '/images/guide-dashboard.webp',
};

// Slides pour le carousel hero
const SLIDES = [
  { img: IMAGES.espaceIsole,   label: 'Espace isole',      caption: 'Un espace dedie par restaurant' },
  { img: IMAGES.inviterEquipe, label: 'Equipe connectee',  caption: 'Invitez votre equipe en un clic' },
  { img: IMAGES.menu,          label: 'Menu digital',      caption: 'Gerez vos plats facilement' },
  { img: IMAGES.qrCommande,    label: 'Commande QR',       caption: 'Le client scanne et commande' },
  { img: IMAGES.dashboard,     label: 'Tableau de bord',   caption: 'Pilotez votre activite en direct' },
];

// Hooks
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
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function AnimatedCounter({ target, suffix = '', duration = 1800 }) {
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

// Data
const guideCards = [
  { image: IMAGES.espaceIsole,   icon: ShieldCheck,    title: 'Un espace par restaurant',      description: "Chaque etablissement dispose de son propre espace, totalement isole. Vos donnees restent propres a votre restaurant." },
  { image: IMAGES.inviterEquipe, icon: Users,          title: 'Inviter votre equipe',          description: "Invitez facilement votre reception ou votre cuisine. Chaque membre dispose des acces adaptes a son role." },
  { image: IMAGES.menu,          icon: UtensilsCrossed,title: 'Gerer votre menu',              description: 'Ajoutez vos plats, organisez vos categories, modifiez les prix et controlez la disponibilite en quelques clics.' },
  { image: IMAGES.qrCommande,    icon: QrCode,         title: 'Commande en salle par QR code', description: 'Vos clients scannent le QR code de leur table et commandent directement depuis leur telephone.' },
  { image: IMAGES.dashboard,     icon: BarChart3,      title: 'Suivi et tableau de bord',      description: "Suivez l activite de votre restaurant, vos commandes et vos performances depuis un espace centralise." },
];

const adminFeatures = [
  { icon: Globe,    title: 'Multi-etablissements',          description: 'Gerez plusieurs restaurants depuis un seul compte super-admin. Vue globale unifiee.',                               color: '#3B82F6' },
  { icon: Lock,     title: 'Acces securise par invitation',  description: 'Aucun compte public. Chaque acces est valide manuellement. Securite totale de vos donnees.',                      color: '#10B981' },
  { icon: Settings2,title: 'Gestion des abonnements',       description: 'Suivez les abonnements actifs, les renouvellements et les statuts de paiement de chaque restaurant.',             color: '#C9A84C' },
  { icon: PieChart, title: 'Analytiques avancees',          description: 'Visualisez les revenus, les commandes, et les performances de chaque etablissement en temps reel.',               color: '#EC4899' },
  { icon: Bell,     title: 'Alertes et Notifications',      description: 'Soyez notifie des nouvelles commandes, des commandes urgentes et des evenements critiques.',                        color: '#F97316' },
  { icon: Layers,   title: 'Architecture multi-roles',      description: 'Super Admin, Admin restaurant, Reception, Cuisine — chaque role a ses propres acces et interfaces.',               color: '#8B5CF6' },
];

const kpis = [
  { label: 'Temps de mise en place', value: 15,  suffix: 'min', icon: Clock      },
  { label: 'Commandes / jour',       value: 200, suffix: '+',   icon: TrendingUp },
  { label: 'Reduction des erreurs',  value: 90,  suffix: '%',   icon: Zap        },
  { label: 'Restaurants geres',      value: 12,  suffix: '+',   icon: Store      },
];

// ─── MAIN ────────────────────────────────────────────────────
export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div style={{ minHeight:'100vh', overflowX:'hidden', backgroundColor:CREAM, color:NAVY }}>
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

// ─── GLOBAL STYLES ───────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

      /* Reveal animations */
      .reveal       { opacity:0; transform:translateY(28px); transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1); }
      .reveal.visible { opacity:1; transform:translateY(0); }
      .reveal-left  { opacity:0; transform:translateX(-32px); transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1); }
      .reveal-left.visible  { opacity:1; transform:translateX(0); }
      .reveal-right { opacity:0; transform:translateX(32px);  transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1); }
      .reveal-right.visible { opacity:1; transform:translateX(0); }
      .delay-1{transition-delay:.08s!important} .delay-2{transition-delay:.16s!important}
      .delay-3{transition-delay:.24s!important} .delay-4{transition-delay:.32s!important}
      .delay-5{transition-delay:.40s!important} .delay-6{transition-delay:.48s!important}

      /* Keyframes */
      @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .float { animation:floatBadge 3.2s ease-in-out infinite; }
      @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.5)} }
      .pulse-dot { animation:pulseDot 1.6s ease-in-out infinite; }
      @keyframes progressBar { from{width:0%} to{width:100%} }
      .progress-bar { animation:progressBar 3.5s linear forwards; }
      @keyframes slideCaption { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      .slide-caption { animation:slideCaption .4s ease forwards; }

      /* Card interactions */
      .card-lift { transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s cubic-bezier(.16,1,.3,1); }
      .card-lift:hover { transform:translateY(-5px); box-shadow:0 20px 48px -12px rgba(31,42,68,.14); }
      .img-zoom img { transition:transform .6s cubic-bezier(.16,1,.3,1); }
      .img-zoom:hover img { transform:scale(1.05); }

      /* Helpers */
      .gold-text { background:linear-gradient(135deg,#C9A84C,#E8C46A,#C9A84C); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .section-sep { width:40px; height:3px; background:linear-gradient(90deg,#C9A84C,transparent); border-radius:2px; margin-bottom:16px; }

      /* ── RESPONSIVE GRID CLASSES (mobile-first) ── */

      /* Hero */
      .hero-grid { display:grid; grid-template-columns:1fr; gap:36px; align-items:center; }
      @media(min-width:768px){ .hero-grid { grid-template-columns:1fr 1fr; gap:52px; } }

      /* Stats */
      .stats-grid { display:grid; grid-template-columns:1fr 1fr; }
      @media(min-width:640px){ .stats-grid { grid-template-columns:repeat(4,1fr); } }
      .stat-item { border-right:none; border-bottom:1px solid rgba(255,255,255,.08); }
      .stat-item:nth-child(odd) { border-right:1px solid rgba(255,255,255,.08); }
      .stat-item:nth-last-child(-n+2):nth-child(odd),
      .stat-item:last-child { border-bottom:none; }
      @media(min-width:640px){
        .stat-item { border-bottom:none !important; border-right:1px solid rgba(255,255,255,.08) !important; }
        .stat-item:last-child { border-right:none !important; }
      }

      /* Features */
      .features-grid { display:grid; grid-template-columns:1fr; gap:14px; }
      @media(min-width:600px){ .features-grid { grid-template-columns:1fr 1fr; gap:18px; } }
      .feat-wide { grid-column:1 / -1 !important; }
      .feat-inner { display:grid; grid-template-columns:1fr; }
      .feat-inner.wide { grid-template-columns:1fr; }
      @media(min-width:600px){ .feat-inner.wide { grid-template-columns:1fr 1fr; } }
      .feat-img { min-height:200px; overflow:hidden; }
      .feat-img.wide { min-height:200px; }
      @media(min-width:600px){ .feat-img.wide { min-height:0; height:100%; } }

      /* Roles */
      .roles-grid { display:grid; grid-template-columns:1fr; gap:36px; align-items:start; }
      @media(min-width:768px){ .roles-grid { grid-template-columns:1fr 1fr; gap:52px; align-items:center; } }

      /* Admin features */
      .admin-grid { display:grid; grid-template-columns:1fr; gap:14px; }
      @media(min-width:480px){ .admin-grid { grid-template-columns:1fr 1fr; gap:14px; } }
      @media(min-width:900px){ .admin-grid { grid-template-columns:repeat(3,1fr); gap:18px; } }

      /* Navbar contact btn — hidden < 440px */
      .nav-contact { display:none !important; }
      @media(min-width:440px){ .nav-contact { display:inline-flex !important; } }

      /* CTA */
      .cta-box { padding:44px 20px; }
      @media(min-width:560px){ .cta-box { padding:68px 48px; } }

      /* Showcase stats overlay */
      .showcase-stats { display:none; }
      @media(min-width:500px){ .showcase-stats { display:flex; } }

      /* Slide dots */
      .slide-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,.35); transition:all .3s; cursor:pointer; border:none; padding:0; }
      .slide-dot.active { width:22px; border-radius:3px; background:#fff; }
    `}</style>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────
function Navbar() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <nav style={{ position:'sticky', top:0, zIndex:100,
      backgroundColor: solid ? 'rgba(247,243,235,.94)' : 'transparent',
      backdropFilter: solid ? 'blur(14px)' : 'none',
      borderBottom: solid ? '1px solid rgba(201,168,76,.15)' : '1px solid transparent',
      transition:'all .4s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 16px', height:64,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link to='/' style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:11, backgroundColor:NAVY,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 12px rgba(31,42,68,.25)' }}>
            <Store size={17} color='#fff' strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:16, color:NAVY, lineHeight:1 }}>Le Resto-HUB</div>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:9, letterSpacing:'.1em',
              textTransform:'uppercase', color:'#aaa', marginTop:2 }}>Restaurant Management</div>
          </div>
        </Link>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href='https://wa.me/242065991104' target='_blank' rel='noopener noreferrer'
            className='nav-contact'
            style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:600, padding:'8px 16px',
              borderRadius:10, backgroundColor:GOLD, color:'#fff', textDecoration:'none',
              boxShadow:'0 4px 14px rgba(201,168,76,.35)', transition:'all .25s',
              alignItems:'center', gap:6 }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 22px rgba(201,168,76,.45)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 14px rgba(201,168,76,.35)';}}>
            Nous contacter
          </a>
          <Link to='/login'
            style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:500, padding:'8px 16px',
              borderRadius:10, border:'1.5px solid '+NAVY, color:NAVY, textDecoration:'none',
              transition:'all .25s', whiteSpace:'nowrap' }}
            onMouseEnter={e=>{e.currentTarget.style.backgroundColor=NAVY;e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.backgroundColor='transparent';e.currentTarget.style.color=NAVY;}}>
            Se connecter
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── HERO SLIDESHOW ──────────────────────────────────────────
function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const INTERVAL = 3500;

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    setAnimKey(k => k + 1);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % SLIDES.length;
        setAnimKey(k => k + 1);
        return next;
      });
    }, INTERVAL);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position:'relative', borderRadius:20, overflow:'hidden',
      boxShadow:'0 24px 64px -16px rgba(31,42,68,.22), 0 0 0 1px rgba(201,168,76,.1)',
      backgroundColor:'#fff' }}>
      {/* Image stack */}
      <div style={{ position:'relative', overflow:'hidden', aspectRatio:'4/3', backgroundColor:'#f5f5f5' }}>
        {SLIDES.map((slide, i) => (
          <img
            key={slide.img}
            src={slide.img}
            alt={slide.label}
            style={{
              position:'absolute', inset:0, width:'100%', height:'100%',
              objectFit:'cover', display:'block',
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'scale(1.03)' : 'scale(1)',
              transition: 'opacity .8s cubic-bezier(.16,1,.3,1), transform 4s ease',
            }}
          />
        ))}
        {/* Dark gradient overlay at bottom */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
          background:'linear-gradient(to top, rgba(31,42,68,.75) 0%, transparent 100%)',
          pointerEvents:'none' }} />
        {/* Caption */}
        <div key={animKey} className='slide-caption'
          style={{ position:'absolute', bottom:16, left:16, right:16 }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
            letterSpacing:'.1em', textTransform:'uppercase', color:GOLD, marginBottom:4 }}>
            {SLIDES[current].label}
          </div>
          <div style={{ fontFamily:'Georgia,serif', fontSize:15, color:'rgba(255,255,255,.9)' }}>
            {SLIDES[current].caption}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, backgroundColor:'rgba(255,255,255,.15)' }}>
        <div key={animKey + '-bar'} className='progress-bar'
          style={{ height:'100%', backgroundColor:GOLD, borderRadius:2 }} />
      </div>

      {/* Dot navigation */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'12px 0 10px',
        backgroundColor:'rgba(31,42,68,.96)' }}>
        {SLIDES.map((_, i) => (
          <button key={i} className={'slide-dot' + (i === current ? ' active' : '')}
            onClick={() => goTo(i)} aria-label={'Slide ' + (i+1)} />
        ))}
      </div>
    </div>
  );
}

// ─── HERO SECTION ────────────────────────────────────────────
function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  const fi = (d=0) => ({
    opacity: mounted?1:0,
    transform: mounted?'translateY(0)':'translateY(20px)',
    transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${d}s, transform .8s cubic-bezier(.16,1,.3,1) ${d}s`,
  });

  return (
    <header style={{ maxWidth:1200, margin:'0 auto', padding:'40px 16px 52px', position:'relative' }}>
      {/* Decorative glow */}
      <div style={{ position:'absolute', top:-60, right:-60, width:320, height:320, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(201,168,76,.1) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div className='hero-grid'>
        {/* ── Left: text ── */}
        <div>
          {/* Badge — simple, sans dot */}
          <div style={{ ...fi(0), display:'inline-flex', alignItems:'center', gap:8, padding:'7px 16px',
            borderRadius:99, backgroundColor:'#fff', border:'1.5px solid rgba(201,168,76,.3)',
            marginBottom:22, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
            <Store size={13} color={GOLD} strokeWidth={2} />
            <span style={{ fontFamily:'Outfit,sans-serif', fontSize:12, fontWeight:600,
              color:NAVY, letterSpacing:'.04em' }}>Solution digitale pour restaurants</span>
          </div>

          <h1 style={{ ...fi(.1), fontFamily:'Georgia,serif', fontSize:'clamp(2rem,6vw,3.8rem)',
            fontWeight:'normal', color:NAVY, lineHeight:1.1, marginBottom:18 }}>
            Votre restaurant,<br />
            <span style={{ position:'relative', display:'inline-block' }}>
              <span className='gold-text'>simplement maitrise.</span>
              <svg style={{ position:'absolute', bottom:-5, left:0, width:'100%', height:9 }} viewBox='0 0 300 9' fill='none'>
                <path d='M2 6 Q75 1 150 6 Q225 11 298 4' stroke={GOLD} strokeWidth='2.5' strokeLinecap='round' fill='none'
                  style={{ strokeDasharray:320, strokeDashoffset:mounted?0:320,
                    transition:'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1) .7s' }} />
              </svg>
            </span>
          </h1>

          <p style={{ ...fi(.18), fontFamily:'Outfit,sans-serif', fontSize:15, color:'#666',
            lineHeight:1.75, marginBottom:26, maxWidth:460 }}>
            Le Resto-HUB centralise les commandes, la cuisine, la reception, le menu et le suivi
            de votre etablissement dans un seul espace unifie.
          </p>

          <div style={{ ...fi(.26), display:'flex', gap:10, flexWrap:'wrap', marginBottom:22 }}>
            <a href='https://wa.me/242065991104' target='_blank' rel='noopener noreferrer'
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 22px',
                borderRadius:13, backgroundColor:NAVY, color:'#fff',
                fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:600, textDecoration:'none',
                boxShadow:'0 8px 24px rgba(31,42,68,.28)', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 14px 36px rgba(31,42,68,.35)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(31,42,68,.28)';}}>
              Nous contacter <ArrowRight size={15} strokeWidth={2} />
            </a>
            <Link to='/login'
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 22px',
                borderRadius:13, backgroundColor:'#fff', color:NAVY,
                fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:500, textDecoration:'none',
                border:'1.5px solid #e2ddd5', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=GOLD;e.currentTarget.style.boxShadow='0 4px 16px rgba(201,168,76,.15)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2ddd5';e.currentTarget.style.boxShadow='none';}}>
              Acceder a mon espace
            </Link>
          </div>

          <div style={{ ...fi(.34), display:'flex', gap:16, flexWrap:'wrap' }}>
            {["Simple a utiliser","Acces securise","Pense pour l'Afrique"].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:6,
                fontFamily:'Outfit,sans-serif', fontSize:13, color:'#777' }}>
                <CheckCircle2 size={14} color={GOLD} strokeWidth={2} />{t}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: animated slideshow ── */}
        <div style={{ ...fi(.15), position:'relative' }}>
          {/* Glow behind slideshow */}
          <div style={{ position:'absolute', inset:-20, borderRadius:32,
            background:'radial-gradient(ellipse, rgba(201,168,76,.18) 0%, transparent 70%)',
            pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <HeroSlideshow />
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── STATS BAND ──────────────────────────────────────────────
function StatsBand() {
  const ref = useReveal();
  return (
    <section style={{ backgroundColor:NAVY }}>
      <div ref={ref} className='reveal stats-grid' style={{ maxWidth:1100, margin:'0 auto' }}>
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`stat-item delay-${i+1}`}
              style={{ textAlign:'center', padding:'28px 12px' }}>
              <Icon size={19} color={GOLD} strokeWidth={1.5} style={{ marginBottom:8 }} />
              <div style={{ fontFamily:'Georgia,serif', fontSize:'2rem', color:'#fff', lineHeight:1 }}>
                <AnimatedCounter target={kpi.value} suffix={kpi.suffix} />
              </div>
              <div style={{ fontFamily:'Outfit,sans-serif', fontSize:11, color:'rgba(255,255,255,.5)', marginTop:6 }}>
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── INTRO ───────────────────────────────────────────────────
function IntroSection() {
  const ref = useReveal();
  return (
    <section style={{ backgroundColor:'#fff', borderTop:'1px solid #f0ede6', borderBottom:'1px solid #f0ede6' }}>
      <div ref={ref} className='reveal' style={{ maxWidth:760, margin:'0 auto', padding:'60px 16px', textAlign:'center' }}>
        <div className='section-sep' style={{ margin:'0 auto 16px' }} />
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
          letterSpacing:'.14em', textTransform:'uppercase', color:GOLD, marginBottom:14 }}>
          Une seule plateforme
        </p>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.6rem,4vw,2.6rem)',
          fontWeight:'normal', color:NAVY, marginBottom:16, lineHeight:1.3 }}>
          Tout votre restaurant,<br />au meme endroit.
        </h2>
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:15, color:'#888', lineHeight:1.8, maxWidth:540, margin:'0 auto' }}>
          Plus besoin de jongler entre plusieurs outils. Le Resto-HUB connecte les differents acteurs
          de votre restaurant autour d'un meme systeme en temps reel.
        </p>
      </div>
    </section>
  );
}

// ─── FEATURES ────────────────────────────────────────────────
function FeaturesSection() {
  const titleRef = useReveal();
  return (
    <section style={{ maxWidth:1200, margin:'0 auto', padding:'60px 16px' }}>
      <div ref={titleRef} className='reveal' style={{ maxWidth:520, marginBottom:36 }}>
        <div className='section-sep' />
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
          letterSpacing:'.14em', textTransform:'uppercase', color:GOLD, marginBottom:12 }}>
          Fonctionnalites
        </p>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.6rem,3.5vw,2.4rem)',
          fontWeight:'normal', color:NAVY, lineHeight:1.3, marginBottom:12 }}>
          Une gestion pensee<br />pour votre quotidien.
        </h2>
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:14, color:'#888', lineHeight:1.75 }}>
          Chaque fonctionnalite repond a un besoin concret du restaurant,
          de la gestion interne jusqu'a l'experience du client.
        </p>
      </div>
      <div className='features-grid'>
        {guideCards.map((card, index) =>
          <FeatureCard key={card.title} card={card} index={index} isWide={index===0} />
        )}
      </div>
    </section>
  );
}

function FeatureCard({ card, index, isWide }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold:0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const Icon = card.icon;
  return (
    <article ref={ref}
      className={`reveal card-lift delay-${Math.min(index+1,5)}${isWide?' feat-wide':''}`}
      style={{ backgroundColor:'#fff', borderRadius:20, overflow:'hidden',
        border:'1px solid #f0ede6', boxShadow:'0 2px 14px rgba(31,42,68,.06)' }}>
      <div className={`feat-inner${isWide?' wide':''}`}>
        <div className={`img-zoom feat-img${isWide?' wide':''}`}
          style={{ backgroundColor:'#f8f6f1', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={card.image} alt={card.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block',
              minHeight: isWide ? undefined : 200 }} />
        </div>
        <div style={{ padding:'22px 22px' }}>
          <div style={{ width:42, height:42, borderRadius:13, backgroundColor:CREAM,
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
            <Icon size={19} color={NAVY} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontFamily:'Georgia,serif', fontSize:18, fontWeight:'normal',
            color:NAVY, marginBottom:10, lineHeight:1.3 }}>{card.title}</h3>
          <p style={{ fontFamily:'Outfit,sans-serif', fontSize:14, color:'#888', lineHeight:1.75 }}>
            {card.description}
          </p>
        </div>
      </div>
    </article>
  );
}

// ─── ROLES ───────────────────────────────────────────────────
function RolesSection() {
  const leftRef  = useRef(null);
  const rightRef = useRef(null);
  useEffect(() => {
    [[leftRef,'reveal-left'],[rightRef,'reveal-right']].forEach(([r,cls]) => {
      const el = r.current; if (!el) return;
      el.classList.add(cls);
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
      }, { threshold:0.1 });
      obs.observe(el); return () => obs.disconnect();
    });
  }, []);
  return (
    <section style={{ backgroundColor:'#fff', borderTop:'1px solid #f0ede6', borderBottom:'1px solid #f0ede6' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'60px 16px' }}>
        <div className='roles-grid'>
          <div ref={leftRef}>
            <div className='section-sep' />
            <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
              letterSpacing:'.14em', textTransform:'uppercase', color:GOLD, marginBottom:12 }}>
              Une equipe connectee
            </p>
            <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.6rem,3.5vw,2.4rem)',
              fontWeight:'normal', color:NAVY, lineHeight:1.3, marginBottom:14 }}>
              Chacun son role.<br />Un seul systeme.
            </h2>
            <p style={{ fontFamily:'Outfit,sans-serif', fontSize:14, color:'#888',
              lineHeight:1.75, marginBottom:24 }}>
              Proprietaire, reception et cuisine travaillent ensemble avec des acces adaptes.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <RoleItem icon={Store}   title='Proprietaire' text='Supervise l activite, la gestion et les performances du restaurant.' accentColor={GOLD}       />
              <RoleItem icon={Users}   title='Reception'    text='Gere les commandes, la communication et la relation avec les clients.' accentColor='#3B82F6' />
              <RoleItem icon={ChefHat} title='Cuisine'      text='Recoit les commandes et suit leur preparation en temps reel.'           accentColor='#10B981' />
            </div>
          </div>
          <div ref={rightRef}>
            <div style={{ backgroundColor:CREAM, borderRadius:22, padding:18 }}>
              <div style={{ backgroundColor:'#fff', borderRadius:16, padding:20,
                boxShadow:'0 6px 28px rgba(31,42,68,.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div>
                    <p style={{ fontFamily:'Outfit,sans-serif', fontSize:10, color:'#bbb',
                      marginBottom:3, letterSpacing:'.06em', textTransform:'uppercase' }}>Tableau de bord</p>
                    <h3 style={{ fontFamily:'Georgia,serif', fontSize:18, color:NAVY }}>Votre restaurant</h3>
                  </div>
                  <BarChart3 size={20} color={GOLD} strokeWidth={1.5} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <DashboardStat label='Commandes'       value='24'   trend='+12%' />
                  <DashboardStat label='En cuisine'      value='08'   trend='actif' />
                  <DashboardStat label='Tables'          value='16'   trend='+2'   />
                  <DashboardStat label='Chiffre du jour' value='128K' trend='+18%' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ADMIN ───────────────────────────────────────────────────
function AdminSection() {
  const titleRef = useReveal();
  return (
    <section style={{ maxWidth:1200, margin:'0 auto', padding:'60px 16px' }}>
      <div ref={titleRef} className='reveal'
        style={{ textAlign:'center', maxWidth:640, margin:'0 auto 48px' }}>
        <div className='section-sep' style={{ margin:'0 auto 16px' }} />
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
          letterSpacing:'.14em', textTransform:'uppercase', color:GOLD, marginBottom:12 }}>
          Espace Admin — Valeur Ajoutee
        </p>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.6rem,4vw,2.6rem)',
          fontWeight:'normal', color:NAVY, marginBottom:16, lineHeight:1.3 }}>
          Pilotez votre reseau<br />
          <span className='gold-text'>depuis un seul tableau de bord.</span>
        </h2>
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:15, color:'#888', lineHeight:1.8 }}>
          L'interface Super Admin offre une vue centralisee et des outils puissants pour gerer
          chaque etablissement, chaque equipe et chaque abonnement.
        </p>
      </div>
      <AdminShowcase />
      <div className='admin-grid' style={{ marginTop:36 }}>
        {adminFeatures.map((feat, i) => <AdminFeatureCard key={feat.title} feat={feat} delay={i} />)}
      </div>
      <div style={{ textAlign:'center', marginTop:36 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 22px',
          borderRadius:14, backgroundColor:NAVY, color:'#fff',
          boxShadow:'0 10px 36px rgba(31,42,68,.25)', flexWrap:'wrap', justifyContent:'center' }}>
          <ShieldCheck size={17} color={GOLD} strokeWidth={1.5} />
          <span style={{ fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:500 }}>
            Acces Super Admin sur demande
          </span>
          <a href='https://wa.me/242065991104' target='_blank' rel='noopener noreferrer'
            style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'Outfit,sans-serif',
              fontSize:12, fontWeight:700, color:GOLD, textDecoration:'none',
              padding:'5px 12px', borderRadius:9, backgroundColor:'rgba(201,168,76,.15)' }}>
            WhatsApp <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminShowcase() {
  const ref = useReveal();
  return (
    <div ref={ref} className='reveal'
      style={{ borderRadius:18, overflow:'hidden', border:'2px solid rgba(201,168,76,.2)',
        boxShadow:'0 24px 60px -16px rgba(31,42,68,.18)' }}>
      {/* Browser chrome */}
      <div style={{ backgroundColor:NAVY, padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {['#EF4444','#F59E0B','#10B981'].map(c =>
            <div key={c} style={{ width:10, height:10, borderRadius:'50%', backgroundColor:c, opacity:.7 }} />
          )}
        </div>
        <div style={{ flex:1, minWidth:0, height:22, borderRadius:6,
          backgroundColor:'rgba(255,255,255,.08)', display:'flex', alignItems:'center',
          paddingLeft:10, overflow:'hidden' }}>
          <span style={{ fontFamily:'Outfit,sans-serif', fontSize:10, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap' }}>
            app.resto-hub.com/super-admin
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px',
          borderRadius:6, backgroundColor:'rgba(201,168,76,.2)', flexShrink:0 }}>
          <ShieldCheck size={10} color={GOLD} strokeWidth={2} />
          <span style={{ fontFamily:'Outfit,sans-serif', fontSize:10, color:GOLD, fontWeight:600 }}>Securise</span>
        </div>
      </div>
      {/* Screenshot */}
      <div style={{ position:'relative', backgroundColor:'#0f1624' }}>
        <img src={IMAGES.dashboard} alt='Tableau de bord super admin'
          style={{ width:'100%', height:'auto', display:'block', objectFit:'cover', maxHeight:380 }} />
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to top,rgba(31,42,68,.8) 0%,transparent 50%)',
          pointerEvents:'none' }} />
        <div className='showcase-stats'
          style={{ position:'absolute', bottom:14, left:14, right:14, gap:10, flexWrap:'wrap' }}>
          {[
            { label:'Restaurants actifs', value:'12',         color:'#10B981' },
            { label:'Revenus ce mois',    value:'4.2M FCFA',  color:GOLD      },
            { label:'Commandes traitees', value:'1 847',      color:'#3B82F6' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor:'rgba(255,255,255,.1)',
              backdropFilter:'blur(12px)', borderRadius:11, padding:'10px 14px',
              border:'1px solid rgba(255,255,255,.15)', flex:'1 1 110px', minWidth:0 }}>
              <div style={{ fontFamily:'Outfit,sans-serif', fontSize:9, color:'rgba(255,255,255,.6)',
                letterSpacing:'.06em', textTransform:'uppercase', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontFamily:'Georgia,serif', fontSize:17, color:s.color }}>{s.value}</div>
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
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold:0.08 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  const Icon = feat.icon;
  return (
    <div ref={ref} className={`reveal delay-${Math.min(delay+1,6)}`}
      style={{ backgroundColor:'#fff', borderRadius:17, padding:20, border:'1px solid #f0ede6',
        boxShadow:'0 2px 10px rgba(31,42,68,.05)', transition:'all .3s ease', cursor:'default' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 40px rgba(31,42,68,.11)';e.currentTarget.style.borderColor=feat.color+'40';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 10px rgba(31,42,68,.05)';e.currentTarget.style.borderColor='#f0ede6';}}>
      <div style={{ width:44, height:44, borderRadius:13, backgroundColor:feat.color+'18',
        display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
        <Icon size={20} color={feat.color} strokeWidth={1.5} />
      </div>
      <h3 style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:'normal',
        color:NAVY, marginBottom:8, lineHeight:1.3 }}>{feat.title}</h3>
      <p style={{ fontFamily:'Outfit,sans-serif', fontSize:13, color:'#888', lineHeight:1.75 }}>
        {feat.description}
      </p>
    </div>
  );
}

// ─── CTA ─────────────────────────────────────────────────────
function CTASection() {
  const ref = useReveal();
  return (
    <section style={{ padding:'20px 16px 64px' }}>
      <div ref={ref} className='reveal cta-box'
        style={{ maxWidth:960, margin:'0 auto', position:'relative', overflow:'hidden',
          borderRadius:26, backgroundColor:NAVY, textAlign:'center',
          boxShadow:'0 32px 72px -14px rgba(31,42,68,.38)' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220,
          borderRadius:'50%', backgroundColor:GOLD, opacity:.08, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-50, width:260, height:260,
          borderRadius:'50%', backgroundColor:GOLD, opacity:.06, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:2,
          background:'linear-gradient(90deg,transparent,'+GOLD+',transparent)' }} />
        <div style={{ position:'relative' }}>
          <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, fontWeight:700,
            letterSpacing:'.14em', textTransform:'uppercase', color:GOLD, marginBottom:14 }}>
            Le Resto-HUB
          </p>
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(1.8rem,5vw,2.8rem)',
            fontWeight:'normal', color:'#fff', marginBottom:14, lineHeight:1.2 }}>
            Pret a moderniser<br />votre restaurant ?
          </h2>
          <p style={{ fontFamily:'Outfit,sans-serif', fontSize:14, color:'rgba(255,255,255,.55)',
            maxWidth:400, margin:'0 auto 28px', lineHeight:1.75 }}>
            L'acces se fait sur invitation. Contactez-nous pour mettre en place votre espace
            en moins de 15 minutes.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <a href='https://wa.me/242065991104' target='_blank' rel='noopener noreferrer'
              style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'13px 26px',
                borderRadius:13, backgroundColor:'#fff', color:NAVY,
                fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:700, textDecoration:'none',
                boxShadow:'0 6px 24px rgba(0,0,0,.18)', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,.26)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,.18)';}}>
              <MessageCircle size={16} strokeWidth={1.5} />WhatsApp
            </a>
            <a href='mailto:jesusnetng@gmail.com'
              style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'13px 26px',
                borderRadius:13, backgroundColor:'transparent', color:'#fff',
                fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:500, textDecoration:'none',
                border:'1.5px solid rgba(255,255,255,.2)', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.backgroundColor='rgba(255,255,255,.08)';e.currentTarget.style.borderColor='rgba(255,255,255,.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.backgroundColor='transparent';e.currentTarget.style.borderColor='rgba(255,255,255,.2)';}}>
              <Mail size={16} strokeWidth={1.5} />Email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop:'1px solid #ebe8e0' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'22px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, backgroundColor:NAVY,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Store size={14} color='#fff' strokeWidth={1.5} />
          </div>
          <span style={{ fontFamily:'Georgia,serif', fontSize:14, color:NAVY }}>Le Resto-HUB</span>
        </div>
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:11, color:'#bbb' }}>
          &copy; {new Date().getFullYear()} Le Resto-HUB &mdash; Brazzaville, Congo
        </p>
      </div>
    </footer>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────
function RoleItem({ icon: Icon, title, text, accentColor }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:14,
      borderRadius:13, backgroundColor:'#fff', border:'1px solid #f0ede6',
      boxShadow:'0 2px 8px rgba(31,42,68,.04)', transition:'all .25s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor+'55';e.currentTarget.style.boxShadow='0 6px 20px '+accentColor+'12';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='#f0ede6';e.currentTarget.style.boxShadow='0 2px 8px rgba(31,42,68,.04)';}}>
      <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        backgroundColor:accentColor+'15' }}>
        <Icon size={18} color={accentColor} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ fontFamily:'Outfit,sans-serif', fontSize:14, fontWeight:600,
          color:NAVY, marginBottom:3 }}>{title}</h3>
        <p style={{ fontFamily:'Outfit,sans-serif', fontSize:13, color:'#888', lineHeight:1.6 }}>{text}</p>
      </div>
    </div>
  );
}

function DashboardStat({ label, value, trend }) {
  const isActive = trend === 'actif';
  return (
    <div style={{ borderRadius:13, backgroundColor:'#f8f6f1', padding:'13px 12px' }}>
      <p style={{ fontFamily:'Outfit,sans-serif', fontSize:9, color:'#bbb',
        marginBottom:5, letterSpacing:'.06em', textTransform:'uppercase' }}>{label}</p>
      <p style={{ fontFamily:'Georgia,serif', fontSize:22, color:NAVY, lineHeight:1 }}>{value}</p>
      <div style={{ marginTop:5, display:'inline-flex', alignItems:'center', gap:3,
        padding:'2px 7px', borderRadius:6,
        backgroundColor: isActive ? 'rgba(16,185,129,.1)' : 'rgba(201,168,76,.1)' }}>
        {isActive && <div className='pulse-dot' style={{ width:5, height:5, borderRadius:'50%', backgroundColor:'#10B981' }} />}
        <span style={{ fontFamily:'Outfit,sans-serif', fontSize:10, fontWeight:600,
          color: isActive ? '#10B981' : GOLD }}>{trend}</span>
      </div>
    </div>
  );
}
