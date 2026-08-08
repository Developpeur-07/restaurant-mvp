import { Link } from 'react-router-dom';
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
} from 'lucide-react';

const NAVY = '#1F2A44';
const GOLD = '#C9A84C';
const CREAM = '#F7F3EB';

// Toutes les images vivent dans /public/images/ — un seul endroit à modifier
// si tu changes de photo, et plus aucune dépendance à un lien externe fragile.
const IMAGES = {
  hero: '/images/restaurant.webp',
  espaceIsole: '/images/guide-espace-isole.jpg',
  inviterEquipe: '/images/guide-inviter-equipe1.jpg',
  menu: '/images/guide-menu1.png',
  qrCommande: '/images/guide-qr-commande.jpg',
  dashboard: '/images/guide-dashboard.webp',
};

const guideCards = [
  {
    image: IMAGES.espaceIsole,
    icon: ShieldCheck,
    title: 'Un espace par restaurant',
    description:
      "Chaque établissement dispose de son propre espace, totalement isolé des autres. Vos données restent propres à votre restaurant.",
  },
  {
    image: IMAGES.inviterEquipe,
    icon: Users,
    title: 'Inviter votre équipe',
    description:
      "Invitez facilement votre réception ou votre cuisine. Chaque membre dispose des accès adaptés à son rôle.",
  },
  {
    image: IMAGES.menu,
    icon: UtensilsCrossed,
    title: 'Gérer votre menu',
    description:
      'Ajoutez vos plats, organisez vos catégories, modifiez les prix et contrôlez la disponibilité en quelques clics.',
  },
  {
    image: IMAGES.qrCommande,
    icon: QrCode,
    title: 'Commande en salle par QR code',
    description:
      'Vos clients scannent le QR code de leur table et commandent directement depuis leur téléphone.',
  },
  {
    image: IMAGES.dashboard,
    icon: BarChart3,
    title: 'Suivi et tableau de bord',
    description:
      "Suivez l'activité de votre restaurant, vos commandes et vos performances depuis un espace centralisé.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen text-neutral-800" style={{ backgroundColor: CREAM }}>

      {/* Animations — définies une seule fois, réutilisées via les classes ci-dessous */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: NAVY }}>
              <Store className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-lg leading-none" style={{ fontFamily: 'Georgia, serif', color: NAVY }}>
                Le Resto-HUB
              </div>
              <div className="text-[10px] tracking-widest uppercase text-neutral-400 mt-1">
                Restaurant Management
              </div>
            </div>
          </Link>

          <Link
            to="/login"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 text-sm font-medium hover:bg-white transition"
          >
            Se connecter
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="max-w-6xl mx-auto px-6 pt-12 md:pt-20 pb-20">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          <div className="text-center lg:text-left fade-in-up">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-neutral-200 text-md font-medium mb-7"
              style={{ color: NAVY }}
            >
        
              Solution digitale pour restaurants
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6"
              style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: NAVY }}
            >
              Votre restaurant,
              <br />
              <span style={{ color: GOLD }}>simplement maîtrisé.</span>
            </h1>

            <p className="text-lg text-neutral-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Le Resto-HUB centralise les commandes, la cuisine, la réception,
              le menu et le suivi de votre établissement dans un seul espace.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="https://wa.me/242065991104"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-medium shadow-sm hover:opacity-90 transition"
                style={{ backgroundColor: NAVY }}
              >
                Nous contacter
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-neutral-200 font-medium hover:border-neutral-300 transition"
                style={{ color: NAVY }}
              >
                Accéder à mon espace
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center lg:justify-start mt-8 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: GOLD }} />
                Simple à utiliser
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: GOLD }} />
                Accès sécurisé
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: GOLD }} />
                Pensé pour l'Afrique
              </div>
            </div>
          </div>

          {/* HERO IMAGE — image entière visible, pas de crop agressif */}
          <div className="relative fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="absolute -inset-4 rounded-[2.5rem] opacity-40 blur-2xl" style={{ backgroundColor: '#E7D8AE' }} />

            <div className="relative bg-white p-3 rounded-4xl shadow-xl">
              <div className="overflow-hidden rounded-3xl bg-neutral-50">
                <img
                  src={IMAGES.hero}
                  alt="Commande de restaurant avec QR code"
                  className="w-full h-auto object-contain"
                />
              </div>

              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-lg px-5 py-4 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: CREAM }}>
                    <QrCode className="w-5 h-5" style={{ color: NAVY }} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Commande digitale</p>
                    <p className="font-semibold text-sm" style={{ color: NAVY }}>Simple & rapide</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ===== INTRODUCTION ===== */}
      <section className="bg-white border-y border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center fade-in-up">
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: GOLD }}>
            Une seule plateforme
          </p>
          <h2
            className="text-3xl md:text-4xl mb-5"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: NAVY }}
          >
            Tout votre restaurant,
            <br className="hidden sm:block" />
            au même endroit.
          </h2>
          <p className="text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Plus besoin de jongler entre plusieurs outils. Le Resto-HUB
            connecte les différents acteurs de votre restaurant autour d'un
            même système.
          </p>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-14 fade-in-up">
          <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
            Fonctionnalités
          </p>
          <h2
            className="text-3xl md:text-4xl mb-4"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: NAVY }}
          >
            Une gestion pensée
            <br />
            pour votre quotidien.
          </h2>
          <p className="text-neutral-500 leading-relaxed">
            Chaque fonctionnalité répond à un besoin concret du restaurant,
            de la gestion interne jusqu'à l'expérience du client.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {guideCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`bg-white rounded-[1.75rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-md transition fade-in-up ${
                  index === 0 ? 'md:col-span-2' : ''
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className={`grid ${index === 0 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>

                  {/* IMAGE — hauteur généreuse, object-contain pour ne rien couper */}
                  <div
                    className={`overflow-hidden bg-neutral-50 flex items-center justify-center ${
                      index === 0 ? 'h-80 md:h-full' : 'h-72'
                    }`}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-contain p-4 hover:scale-[1.03] transition duration-500"
                    />
                  </div>

                  <div className="p-7 md:p-8">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: CREAM }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: NAVY }} />
                    </div>
                    <h3
                      className="text-xl mb-3"
                      style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: NAVY }}
                    >
                      {card.title}
                    </h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{card.description}</p>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ===== ROLES ===== */}
      <section className="bg-white border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div className="fade-in-up">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
                Une équipe connectée
              </p>
              <h2
                className="text-3xl md:text-4xl mb-6"
                style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', color: NAVY }}
              >
                Chacun son rôle.
                <br />
                Un seul système.
              </h2>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Propriétaire, réception et cuisine travaillent ensemble
                avec des accès adaptés à leurs responsabilités.
              </p>

              <div className="space-y-4">
                <RoleItem icon={Store} title="Propriétaire" text="Supervise l'activité et la gestion du restaurant." />
                <RoleItem icon={Users} title="Réception" text="Gère les commandes et la relation avec les clients." />
                <RoleItem icon={ChefHat} title="Cuisine" text="Reçoit les commandes et suit leur préparation." />
              </div>
            </div>

            <div className="rounded-4xl p-8 fade-in-up" style={{ backgroundColor: CREAM, animationDelay: '0.1s' }}>
              <div className="bg-white rounded-3xl p-7 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-xs text-neutral-400 mb-1">Tableau de bord</p>
                    <h3 className="text-xl" style={{ fontFamily: 'Georgia, serif', color: NAVY }}>
                      Votre restaurant
                    </h3>
                  </div>
                  <BarChart3 className="w-6 h-6" style={{ color: GOLD }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DashboardStat label="Commandes" value="24" />
                  <DashboardStat label="En cuisine" value="08" />
                  <DashboardStat label="Tables" value="16" />
                  <DashboardStat label="Aujourd'hui" value="128K" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

            {/* ===== CTA ===== */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div
          className="relative overflow-hidden rounded-4xl px-7 py-14 md:px-14 text-center fade-in-up"
          style={{ backgroundColor: NAVY }}
        >
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: GOLD }} />
          <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full opacity-10" style={{ backgroundColor: GOLD }} />

          <div className="relative">
            <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: GOLD }}>
              Le Resto-HUB
            </p>
            <h2 className="text-3xl md:text-4xl text-white mb-5" style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal' }}>
              Prêt à moderniser
              <br />
              votre restaurant ?
            </h2>
            <p className="text-white/60 max-w-xl mx-auto mb-8 leading-relaxed">
              L'accès se fait sur invitation. Contactez-nous pour mettre
              en place votre espace restaurant.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/242065991104"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white font-medium hover:bg-neutral-100 transition"
                style={{ color: NAVY }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                WhatsApp
              </a>
              <a
                href="mailto:jesusnetng@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border border-white/20 text-white font-medium hover:bg-white/10 transition"
              >
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                Email
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ===== FOOTER ===== */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: NAVY }}>
                <Store className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm" style={{ fontFamily: 'Georgia, serif', color: NAVY }}>
                Le Resto-HUB
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              © {new Date().getFullYear()} Le Resto-HUB — Brazzaville, Congo
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

function RoleItem({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: CREAM }}>
        <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: NAVY }} />
      </div>
      <div>
        <h3 className="font-medium mb-1" style={{ color: NAVY }}>{title}</h3>
        <p className="text-sm text-neutral-500">{text}</p>
      </div>
    </div>
  );
}

function DashboardStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-5">
      <p className="text-xs text-neutral-400 mb-2">{label}</p>
      <p className="text-2xl" style={{ fontFamily: 'Georgia, serif', color: NAVY }}>{value}</p>
    </div>
  );
}