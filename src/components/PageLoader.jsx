import { ADMIN_CSS, adminVars } from '../lib/adminCss'

// Écran de chargement commun à toutes les pages internes.
//
// Pourquoi un composant : chaque page écrivait le sien, avec son propre fond,
// sa propre couleur de texte et parfois son propre libellé. Le passage du
// chargement à la page provoquait donc un saut visuel — fond différent, texte
// d'une autre teinte — alors qu'il devrait être imperceptible.
//
// Celui-ci utilise les mêmes variables et la même feuille de style que les
// pages elles-mêmes : le fond, la bordure et la couleur du texte sont donc
// exactement ceux de la page qui va s'afficher.
export default function PageLoader({ theme, label = 'Chargement…' }) {
  return (
    <div
      className="adm-page adm-loader"
      style={adminVars(theme)}
    >
      <style>{ADMIN_CSS}</style>

      <span className="adm-spinner" aria-hidden="true" />
      <p className="adm-loader-label">{label}</p>
    </div>
  )
}
