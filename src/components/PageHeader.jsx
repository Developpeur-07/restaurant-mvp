import { ArrowLeft, Sun, Moon } from 'lucide-react'

// En-tête commun à toutes les pages internes.
//
// Pourquoi un composant : le bouton « Retour » et l'interrupteur de mode sombre
// étaient reconstruits à la main dans chaque page, avec à chaque fois un
// alignement, un espacement et une couleur différents. D'une page à l'autre, le
// même bouton changeait donc de place — on le cherchait.
//
// La règle tenue ici est simple et mécanique : « Retour » est toujours le
// premier élément à gauche, l'interrupteur de thème toujours le dernier à
// droite. Le reste (titre, logo, actions) se glisse entre les deux et se
// comprime sans jamais déplacer les deux bouts.
//
// Les actions propres à une page se passent en `children` : elles se posent
// AVANT l'interrupteur, qui reste donc toujours au même endroit physique.
export default function PageHeader({
  brand,
  theme,
  darkMode,
  toggleDarkMode,
  onBack,
  backLabel = 'Retour',
  title,
  subtitle,
  showLogo = true,
  icon,
  children,
}) {
  const primary = brand?.primary_color || theme?.primary || '#1F2A44'

  return (
    <div
      className="adm-header"
      style={{
        background: `linear-gradient(135deg, ${primary}CC, ${primary})`,
        '--adm-accent': brand?.secondary_color || '#C9A84C',
      }}
    >
      <div className="adm-header-inner">
        <div className="adm-header-left">
          {onBack && (
            <button type="button" className="adm-icon-btn" onClick={onBack}>
              <ArrowLeft size={15} />
              <span className="adm-icon-btn-text">{backLabel}</span>
            </button>
          )}

          {showLogo && brand?.logo_url && (
            <img className="adm-header-logo" src={brand.logo_url} alt="" />
          )}

          {(title || subtitle) && (
            <div className="adm-header-titles">
              {subtitle && <p className="adm-header-kicker">{subtitle}</p>}
              {title && (
                <h1 className="adm-header-title">
                  {icon && <span className="adm-header-icon">{icon}</span>}
                  {title}
                </h1>
              )}
            </div>
          )}
        </div>

        <div className="adm-header-right">
          {children}

          <button
            type="button"
            className="adm-icon-btn adm-icon-btn--square"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
