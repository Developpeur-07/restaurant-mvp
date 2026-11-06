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

export const ADMIN_CSS = `
.adm-page{min-height:100vh;background:var(--adm-page)}

.adm-header-inner{
  max-width:520px;margin:0 auto;display:flex;justify-content:space-between;
  align-items:center;gap:12px;flex-wrap:wrap;
}

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
  /* Deux colonnes dans une section : suffisant pour aerer, sans ecraser les
     cartes dont le contenu est dense. */
  .adm-section{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
  .adm-header-inner{max-width:1120px}
  .adm-card{padding:24px}
  .adm-list{gap:16px}
  .adm-section-title{font-size:1.15rem}
}

/* Les listes longues gagnent une troisieme colonne sur grand ecran : ce sont
   des cartes courtes et repetitives, pas des formulaires. */
@media (min-width:1180px){
  .adm-list{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`;
