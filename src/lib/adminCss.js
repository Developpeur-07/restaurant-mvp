// Feuille de style partagée des pages d'administration.
//
// Pourquoi des classes plutôt que des styles en ligne : un style en ligne ne
// peut pas réagir à la largeur de l'écran. C'est la cause exacte de l'absence
// de responsive sur les pages internes, qui restaient des colonnes étroites sur
// un écran large (480px pour les Paramètres, 640px pour l'Historique).
//
// Les couleurs ne sont donc PAS écrites ici : elles viennent de variables CSS
// que chaque page pose une seule fois sur son élément racine. Le thème et le
// mode sombre continuent de s'appliquer normalement.
//
// Contrat — une page qui utilise cette feuille doit fournir :
//   --adm-page      fond de la page
//   --adm-card      fond des cartes
//   --adm-text      texte principal
//   --adm-text-2    texte secondaire
//   --adm-border    bordures
//   --adm-primary   couleur de marque (blocs pleins)
//   --adm-accent    couleur d'accent (repli : #C9A84C)
//
// Préfixe adm- : exclut toute collision avec un utilitaire Tailwind (les cartes
// de la page d'accueil étaient tombées à 12px à cause de w-3 / w-2).

// Contrat centralisé. Chaque page pose ces variables sur son élément racine ;
// passer par cette fonction garantit qu'aucune page n'en oublie une, ni
// n'invente sa propre teinte pour un même usage.
export const adminVars = (theme, brand) => ({
  '--adm-page': theme.pageBackground,
  '--adm-card': theme.cardBackground,
  '--adm-text': theme.textPrimary,
  '--adm-text-2': theme.textSecondary,
  '--adm-muted': theme.textMuted,
  '--adm-border': theme.borderLight,
  '--adm-primary': theme.primary,
  '--adm-accent': brand?.secondary_color || '#C9A84C',
})

export const ADMIN_CSS = `
.adm-page{min-height:100vh;background:var(--adm-page)}

/* En-tête : « Retour » collé à gauche, thème collé à droite, quoi qu'il arrive.
   nowrap + min-width:0 : le titre se comprime et tronque, mais jamais il ne
   pousse l'interrupteur de thème hors de sa place. */
.adm-header{
  position:sticky;top:0;z-index:40;padding:20px;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.adm-header-inner{
  max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;
  flex-wrap:nowrap;
}
.adm-header-left{display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 auto}
.adm-header-right{display:flex;align-items:center;gap:8px;flex:none;margin-left:auto}
.adm-header-titles{min-width:0}
.adm-header-kicker{
  margin:0;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;
  font-family:Georgia,serif;color:var(--adm-accent,#C9A84C);
}
.adm-header-title{
  margin:0;font-size:1.25rem;font-family:Georgia,serif;color:#fff;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.adm-header-icon{
  display:inline-flex;vertical-align:-3px;margin-right:8px;flex:none;
  color:var(--adm-accent,#C9A84C);
}
.adm-header-logo{
  width:36px;height:36px;flex:none;border-radius:50%;object-fit:cover;
  border:2px solid var(--adm-accent,#C9A84C);
}

/* Boutons d'en-tête : même gabarit partout. */
.adm-icon-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;
  background:rgba(255,255,255,.2);border:none;border-radius:10px;
  padding:9px 14px;color:#fff;cursor:pointer;font-size:.85rem;
  font-family:inherit;line-height:1;
}
.adm-icon-btn--square{padding:9px 11px}

/* Écran de chargement : mêmes variables que les pages, donc passage du
   chargement au contenu sans saut de couleur. */
.adm-loader{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:100vh;gap:14px;padding:20px;
}
.adm-loader-label{margin:0;font-family:Georgia,serif;color:var(--adm-text-2)}
.adm-spinner{
  width:30px;height:30px;flex:none;border-radius:50%;
  border:3px solid var(--adm-border);border-top-color:var(--adm-primary,#1F2A44);
  animation:adm-spin .8s linear infinite;
}
@keyframes adm-spin{to{transform:rotate(360deg)}}

.adm-wrap{
  max-width:520px;margin:0 auto;padding:24px 16px 48px;
  display:flex;flex-direction:column;gap:22px;
}
.adm-full{width:100%}

/* Chaque section est sa propre grille : les cartes d'un meme theme restent
   ensemble, et deux sujets sans rapport ne se retrouvent jamais cote a cote. */
.adm-section{
  display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start;
  min-width:0;
}
.adm-section-head{grid-column:1/-1;min-width:0}
.adm-section-title{
  margin:0 0 5px;font-family:Georgia,serif;font-size:1.05rem;color:var(--adm-text);
}
.adm-section-sub{margin:0;font-size:.78rem;color:var(--adm-text-2);line-height:1.5}

.adm-card{
  background:var(--adm-card);border-radius:20px;padding:20px;
  box-shadow:0 2px 8px rgba(0,0,0,0.08);
  /* Sans min-width:0, un contenu long (adresse e-mail, jeton d'invitation,
     nom de plat) etire la piste de la grille et provoque un defilement
     horizontal. C'est le piege numero un des grilles CSS. */
  min-width:0;
  /* La carte est une COLONNE de rangees : c'est elle, le parent, qui empile.
     Pas de gap volontairement — les enfants gardent leurs marges propres, sinon
     l'espacement serait compte deux fois. */
  display:flex;flex-direction:column;
}

/* ── Rangee de reglage ──────────────────────────────────────────────────────
   Le motif demande : le parent empile en colonne, l'enfant se dispose en
   rangee. La rangee est donc l'unite de base d'une carte de reglages :
   libelle a gauche, controle a droite sur grand ecran ; elle redevient une
   colonne sur mobile, ou la largeur manque pour les mettre cote a cote. */
.adm-row{display:flex;flex-direction:column;gap:10px;min-width:0}
.adm-row-label{min-width:0}
.adm-row-title{
  margin:0;font-family:Georgia,serif;font-size:.95rem;
  color:var(--adm-text);font-weight:600;
}
.adm-row-sub{margin:4px 0 0;font-size:.78rem;color:var(--adm-text-2);line-height:1.5}
.adm-row-control{
  min-width:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;
}

/* Separateur entre rangees d'une meme carte : donne un rythme de liste sans
   enfermer chaque rangee dans un cadre. */
.adm-row + .adm-row{
  border-top:1px solid var(--adm-border);padding-top:16px;margin-top:2px;
}
.adm-label{
  display:block;font-size:.78rem;color:var(--adm-text-2);
  margin-bottom:8px;font-weight:600;
}
.adm-input{
  width:100%;box-sizing:border-box;font-family:inherit;
  border:2px solid var(--adm-border);border-radius:12px;padding:12px 15px;
  font-size:.88rem;margin-bottom:12px;outline:none;
  background:var(--adm-page);color:var(--adm-text);
}

/* Un mot plus long que sa carte doit se couper plutot que deborder. */
.adm-card p,.adm-card h2,.adm-card strong,.adm-card span,.adm-card code{
  overflow-wrap:break-word;
}

/* Bloc chiffre cle : total encaisse, compteur mise en avant. */
.adm-hero{
  background:var(--adm-primary);border-radius:20px;padding:24px;text-align:center;
}
.adm-hero-label{
  color:rgba(255,255,255,.72);font-size:.75rem;margin:0 0 6px;
  letter-spacing:.1em;text-transform:uppercase;
}
.adm-hero-value{
  color:var(--adm-accent,#C9A84C);font-size:2rem;font-weight:bold;font-family:Georgia,serif;margin:0;
  overflow-wrap:anywhere;
}
.adm-hero-sub{color:rgba(255,255,255,.55);font-size:.72rem;margin:6px 0 0}

/* Liste de cartes de meme nature : commandes, mouvements, articles. */
.adm-list{
  display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start;
}

/* Ligne libelle / valeur. flex-wrap et min-width:0 empechent un nom de plat
   long de pousser le prix hors de l'ecran. */
.adm-line{
  display:flex;justify-content:space-between;align-items:baseline;
  gap:10px;flex-wrap:wrap;font-size:.8rem;margin-bottom:6px;
}
.adm-line>span{min-width:0}

.adm-empty{text-align:center;padding:56px 0}

@media (min-width:700px){
  .adm-wrap{max-width:1120px;padding:32px 24px 56px;gap:28px}
  /* La section reste sur UNE colonne : elle empile ses cartes. Ce sont les
     cartes qui se disposent en rangees, pas la section. */
  .adm-section{gap:20px}
  .adm-header-inner{max-width:1120px}
  .adm-card{padding:24px}
  .adm-list{gap:16px}
  .adm-section-title{font-size:1.15rem}
  .adm-header-title{font-size:1.4rem}

  /* La rangee devient horizontale : libelle a gauche, controle a droite.
     Deux pistes larges plutot qu'un auto cote controle, sinon un bouton long
     ecrase le libelle. */
  .adm-row{
    display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);
    gap:24px;align-items:center;
  }
  .adm-row-control{justify-content:flex-end}
}

/* Sous 430px, le libellé « Retour » est sacrifié : le bouton reste à sa place
   et garde sa cible tactile, au lieu de comprimer le titre. */
@media (max-width:430px){
  .adm-icon-btn-text{display:none}
  .adm-icon-btn{padding:9px 11px}
}

/* Les listes longues gagnent une troisieme colonne sur grand ecran : ce sont
   des cartes courtes et repetitives, pas des formulaires. */
@media (min-width:1180px){
  .adm-list{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`;
