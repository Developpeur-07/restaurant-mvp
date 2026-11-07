## ✅ Chantier A — Page d'accueil publique + inscription par token (clos, 08 août 2026)

**Schéma :**
- Table `restaurant_registration_tokens` — dédiée, séparée de `staff_invitation_tokens`
  (création de tenant vs ajout de staff = deux opérations distinctes). RLS activée,
  accès direct réservé au super-admin uniquement.
- RPC `use_restaurant_registration_token(token, restaurant_name, owner_user_id)` —
  SECURITY DEFINER, atomique (`FOR UPDATE` anti double-consommation), valide le token,
  crée le restaurant (le trigger `trg_set_trial_on_restaurant_insert` remplit
  automatiquement `trial_start_at`/`trial_end_at`/`subscription_status`), marque
  le token utilisé. Testé : création réussie, réutilisation bloquée, expiration gérée.

**Front :**
- `HomePage.jsx` (route `/`) — remplace l'ancienne redirection dure vers le menu de
  Rêve Voilé. Vitrine produit + section guide (comment ça marche : espace isolé,
  rôles, inviter l'équipe, gérer le menu, QR code, dashboard) + contact
  WhatsApp/email. Images servies depuis `public/images/`, plus de dépendance à des
  liens externes fragiles. Animation d'apparition douce (`fadeInUp`) en cascade.
- `RegisterPage.jsx` (route `/register/:token`) — formulaire création compte,
  aligné visuellement sur `Login.jsx` (styles inline, `useTheme`, palette navy).
  Flux : `supabase.auth.signUp()` → RPC → page de confirmation → lien vers `/login`.
  Nécessite "Confirm email" désactivé côté Supabase (vérifié, c'est bien le cas) —
  sinon la session n'est pas active immédiatement après signUp et le RPC échoue.

**Génération de token — reste manuel, comme prévu :**
```sql
INSERT INTO restaurant_registration_tokens (intended_plan, created_by)
VALUES ('pro', (SELECT id FROM auth.users WHERE email = 'jesusnetng@gmail.com'))
RETURNING token;
```
Pas d'interface de génération — cohérent avec le volume actuel et le principe
"manuel d'abord". Lien construit à la main : `https://<domaine>/register/<token>`.

**Décision actée en amont (déjà notée précédemment) :** création de restaurant
premium reste manuelle via Supabase direct ; ce flux `/register/:token` couvre le
free tier auto-onboardé, pas le segment partenaire.

**Point de vigilance non couvert (accepté pour l'instant, faible volume) :** si
`signUp()` réussit mais que le RPC échoue ensuite (token expiré entre-temps), un
compte auth orphelin reste créé sans restaurant associé. Pas de rollback automatique.

**Nettoyage effectué en session :** suppression des restaurants de test
(La Cérise, Chez Marie, Obrigado ×2 — doublon découvert) via CTE atomique avec
`RETURNING`, ne conservant que Rêve Voilé (`b0b0b0b0-...`, active,
jesusnetng@gmail.com). Comptes `auth.users` orphelins correspondants supprimés
via Dashboard Supabase.

## 🎯 Décision actée (session du 08 août 2026, suite) — Stratégie de paiement segmentée

**Constat** : le todo initial traitait "paiement" comme un problème unique et
penchait par défaut vers Mobile Money/CinetPay, en confondant deux paiements
différents avec deux payeurs différents :
1. Abonnement SaaS — le restaurateur paie Le Bourgeois (B2B, faible volume,
   montant fixe récurrent)
2. Commande client — le client du restaurant paie son addition (volume élevé,
   petit montant, consommateur final)

**Décision** : segmenter par cas d'usage plutôt qu'un mécanisme unique.
- **Abonnement SaaS (Phase 2, révisée)** : virement bancaire + confirmation
  manuelle via `SuperAdminRoute`. Justifié par le profil du segment premium
  (clients avec infrastructure bancaire déjà en place) et le faible volume —
  cohérent avec le principe "manuel d'abord". Débloque la monétisation sans
  attendre la résolution du blocage RCCM.
- **Paiement client final (Phase 5bis, inchangée)** : CinetPay/Mobile Money
  reste pertinent ici — c'est son vrai terrain (volume élevé, petits montants,
  consommateur non-bancarisé).

**Impact** : le blocage CinetPay/RCCM ne bloque plus le chemin critique de
l'abonnement SaaS. Phase 2 peut être codée immédiatement (instructions de
virement + bouton confirmation manuelle), sans dépendance à un compte marchand
agrégateur.

**Reste à vérifier (prérequis Phase 2 révisée)** : confirmer avec la banque si
un compte professionnel pour recevoir les virements nécessite un RCCM, ou si un
compte plus simple suffit en attendant la régularisation de la structure propre.

---

## 💳 Intégration Paiement Automatisé Yabetoo & Webhooks (09 septembre 2026)

**Problème résolu :**
- Correction intégrale du bug de statut du restaurant qui ne basculait pas à `active` après un paiement Yabetoo réussi.

**Réalisations Backend & Serverless API :**
- `api/webhooks/yabetoo-subscription.js` — Webhook officiel de souscription SaaS. Validation HMAC-SHA256, recherche résiliente de transaction pending par `restaurant_id`, mise à jour de `subscription_payments` (`succeeded`), activation de `restaurants` (`subscription_status = 'active'`, `plan = 'pro'`, `next_billing_date = +1 mois`) et audit trail dans `subscription_events`.
- `api/webhooks/yabetoo-order.js` — Webhook de paiement des commandes client final (emporter & sur place). Validation HMAC, passage de `payments` à `succeeded` et de `orders.status` à `paid`.
- `api/webhooks/yabetoo-debug.js` — Alias/proxy vers `yabetoo-subscription.js` pour la rétrocompatibilité des webhooks Yabetoo déjà configurés.
- `api/create-order-payment-session.js` — Prise en charge universelle des commandes clients finaux (`emporter` et `sur_place`).

**Réalisations Frontend & UX :**
- `SubscriptionProvider.jsx` — Ecouteur Supabase Realtime sur la table `restaurants` pour la mise à jour instantanée du statut et des fonctionnalités du restaurant sans rechargement de page.
- `Settings.jsx` — Prise en charge des query params d'URL `?payment=success` et `?payment=cancelled` avec toast d'information et nettoyage d'URL.
- `Tracking.jsx` — Ajout du composant de paiement Mobile Money (MTN / Airtel via Yabetoo) pour le client final, notification de paiement et synchronisation Realtime.

**Documentation d'Architecture (`docs/`) :**
- `docs/ARCHITECTURE_PAIEMENT.md` — Modèle d'architecture des abonnements et commandes, signatures HMAC-SHA256, diagramme de séquence et réconciliation.
- `docs/CORRECTIONS_BUGS.md` — Analyse exhaustive des vulnérabilités et correctifs.
- `docs/GUIDE_DEPLOIEMENT_WEBHOOKS.md` — Guide de configuration Vercel & Yabetoo Dashboard.

---

## 🛠️ Résolution session Yabetoo & Activation synchrone PRO (16 septembre 2026)

**Problèmes résolus :**
- Correction de l'erreur Yabetoo `Session is not open (status: complete)` et du crash React `#418` causés par des tentatives d'ouverture ou de recréation de sessions Yabetoo déjà fermées.
- Résolution du problème d'inactivation d'abonnement lors du retour de paiement (`?payment=success`), où le statut restait affiché "Suspendu".

**Réalisations Backend :**
- `api/verify-subscription-payment.js` — Endpoint de vérification synchrone du paiement d'abonnement SaaS post-redirection. Interroge directement l'API Yabetoo (`GET /v1/sessions/:id`), active immédiatement le restaurant (`subscription_status = 'active'`, `plan = 'pro'`) et enregistre l'événement d'audit.
- `api/create-order-payment-session.js` — Ajout d'un contrôle préalable sur la table `payments` (`status = 'succeeded'`) renvoyant un statut `409` pour empêcher les doublons de session Yabetoo. Correction du retour `sessionId` vers `yabetooSessionId`.
- `api/create-checkout-session.js` — Refus des demandes de session pour les abonnements déjà actifs (`409`).

**Réalisations Frontend & UX :**
- `Settings.jsx` — Invocateur synchrone de `/api/verify-subscription-payment` lors de la réception de `?payment=success` pour basculer instantanément l'affichage vers **Actif (Pro)** sans dépendre uniquement des webhooks.
- `Tracking.jsx` — Gardes empêchant d'initier un paiement sur une commande déjà réglée en ligne (`isPaidOnline`) ou annulée.

---

## 🔐 Sécurisation espace admin : rôles, 2FA et mots de passe équipe (05 novembre 2026)

**Faille corrigée :** `AdminRoute` n'empilait que `ProtectedRoute`, lequel vérifie
uniquement la présence d'une session. Un compte **cuisine** pouvait ouvrir
`/dashboard` en tapant l'URL et consulter les stats et le chiffre d'affaires.
Aucune 2FA n'existait nulle part.

**Filtrage par rôle (`src/components/RoleGuard.jsx`)**
- Propriétaire et réception accèdent à l'espace admin ; la cuisine est redirigée
  vers `/kitchen`. Posé dans `AdminRoute` avant `SubscriptionProvider`.

**Double authentification TOTP (`src/components/MfaGate.jsx`, `Settings.jsx`)**
- TOTP (RFC 6238) via l'API MFA native Supabase : `enroll` → QR code
  (`qrcode.react`) → `challengeAndVerify` → session `aal2`.
- Règle : 2FA exigée **uniquement** si le compte possède un facteur vérifié.
  Impossible de s'enfermer dehors tant qu'on n'a rien activé.
- Posé sur `AdminRoute` et `SuperAdminRoute`.
- Choix TOTP plutôt que SMS/WhatsApp : WhatsApp Business (Meta) et Twilio sont
  payants, avec validation de templates ; le TOTP est gratuit, instantané et
  fonctionne hors ligne — décisif pour une connexion depuis un restaurant.

**Codes de secours (`api/admin/security/recovery-codes.js`)**
- 10 codes à usage unique, générés une seule fois, stockés **hashés scrypt**
  (sel aléatoire, `timingSafeEqual`) dans `admin_recovery_codes`.
- Table sans aucune policy RLS : invisible pour `anon` et `authenticated`, seuls
  les appels serveur y touchent.
- Consommer un code supprime les facteurs TOTP via l'admin API : on récupère
  l'accès, puis on ré-enrôle. Plafonné à 10 essais / heure.

**Réinitialisation des mots de passe équipe (`api/admin/staff.js`)**
- Impossible côté navigateur (`updateUserById` exige la `service_role`) →
  fonction serverless Vercel.
- Chaîne : JWT vérifié **côté serveur** → `aal2` exigé si 2FA activée →
  appelant propriétaire du restaurant → cible membre de ce restaurant →
  mot de passe ≥ 8 caractères et non trivial → journalisé + plafonné.
- `GET` renvoie l'équipe avec les emails (résolus via l'admin API, `auth.users`
  n'étant pas lisible par le client).
- `Settings.jsx` : section *Mots de passe de l'équipe* — liste, générateur de
  mot de passe fort, réinitialisation en 2 clics.

**Schéma (`docs/021_admin_security.sql`)**
- `admin_recovery_codes` et `admin_audit_log` (RLS, indexes, `revoke` explicite).
- Bloc de durcissement RLS commenté : exiger `aal2` au niveau Postgres pour les
  comptes ayant activé la 2FA. Volontairement non activé avant le test terrain.

**Performance — `src/pages/Menu.jsx`**
- Les 3 requêtes de chargement (restaurant, plats, catégories) passent en
  `Promise.all` : 3 allers-retours séquentiels → 1.
- `select('*')` → `select('id, name, price, image_url, estimated_minutes, description')`.
- Debounce 250 ms sur la recherche, `useMemo` sur la catégorisation.
- Squelette de chargement animé à la place du simple texte.
- `loading="lazy" decoding="async"` sur les 3 images de la page.

**Documentation :** `docs/ADMIN_SECURITE.md` (mise en route, modèle de menace,
limites connues).

**À faire côté ops :** exécuter `docs/021_admin_security.sql`, puis étendre
`SUPABASE_SERVICE_ROLE_KEY` aux environnements Preview et Development dans
Vercel (elle n'était définie qu'en Production).


---

## ⚡ Passe de performance — bundle, requêtes et fuites (05 novembre 2026)

**Fuites de timers (cause n°1 de la RAM qui monte en service)**
- `Dashboard.jsx` et `Kitchen.jsx` : chaque commande entrante empilait un
  `setTimeout(..., 3000)` jamais annulé, qui faisait un `setState` sur un
  composant potentiellement démonté. Timer désormais conservé dans une
  `useRef`, réinitialisé à chaque commande et purgé au démontage.
- Audit des canaux Supabase Realtime : `Dashboard`, `Kitchen`, `Tracking` et
  `SubscriptionProvider` font tous leur `removeChannel` dans le cleanup —
  aucune fuite de ce côté-là, rien à corriger.

**Requêtes**
- `Dashboard.jsx` : `select('*')` → colonnes explicites sur `orders` et
  `orders_archive`. L'archive est interrogée toutes les 60 s : on ne rapatrie
  plus que `items` et `created_at` au lieu de la ligne entière.
- `Kitchen.jsx` : idem sur `orders`.
- `Tracking.jsx` : le restaurant, les commandes sœurs et le paiement étaient
  récupérés l'un après l'autre — les trois ne dépendent que de la commande,
  ils passent en `Promise.all` (4 allers-retours → 2). Plus aucun `select('*')`
  dans le fichier.

**Bundle**
- `vite.config.js` : découpage des dépendances stables (`react` 190 ko,
  `supabase` 200 ko, `router` 41 ko) dans des chunks séparés. Elles changent
  rarement → restent en cache d'un déploiement à l'autre, et se téléchargent
  en parallèle du code applicatif. Rolldown (Vite 8) exige la forme fonction.
- Chunk d'entrée : **498 ko → 59 ko**. `/menu` ne charge plus `Tracking`
  (page désormais en `React.lazy`), soit ~17 ko de moins sur le parcours
  critique client.
- `Menu.jsx` et `Login.jsx` restent en import direct : un chunk supplémentaire
  à récupérer avant affichage coûterait plus cher qu'il ne ferait gagner sur
  le parcours scan QR → commande.

**Index SQL**
- `docs/022_performance_indexes.sql` : index sur les filtres réels
  (`restaurant_id`, `status`, `created_at`, `session_id`, `order_id`…).
  Le script vérifie l'existence de chaque table et colonne avant de créer :
  une différence de schéma produit un NOTICE au lieu d'une erreur fatale.
  Réexécutable.

**Lint** : `eslint.config.js` étend l'override Node à `vite.config.js`
(`process.env`). Aucune nouvelle erreur introduite ; les 11 restantes sont
antérieures à cette passe.


---

## 🧪 Révision de `021_admin_security.sql` (05 novembre 2026)

Suite à une relecture externe du fichier SQL. Un point bloquant annoncé —
« `public.restaurants` et `public.admin_audit_log` absentes du schéma » — est un
**faux positif** : l'instantané consulté provenait d'un compte Supabase sans
aucun projet (`list_projects` → `items: []`, accès direct au projet refusé en
403). `public.restaurants` est bien réelle, avec `id` et `owner_id` : 24 points
d'appel dans le dépôt, lectures client incluses (`SubscriptionProvider.jsx`,
`QRCode.jsx`) et écriture à la création d'un restaurant (`Onboarding.jsx`).

Corrections retenues :
- **Performance RLS** : `auth.uid()` → `(select auth.uid())` dans la policy de
  `admin_audit_log`. Postgres évalue la fonction une fois par requête au lieu
  d'une fois par ligne.
- **Intégrité référentielle** : clés étrangères ajoutées sur `actor_user_id`,
  `target_user_id` et `restaurant_id`, en `ON DELETE SET NULL` — une entrée
  d'audit doit survivre à la suppression d'un compte staff, ce qui est
  précisément l'intérêt d'un journal. Bloc idempotent.
- **Index** : `restaurants.owner_id` indexé, mais seulement si aucun index
  n'existe déjà sur cette colonne (la policy fait une sous-requête dessus à
  chaque lecture du journal).
- **`revoke all ... from anon`** ajouté sur `admin_audit_log` : un journal
  d'audit ne doit même pas avoir de privilèges de table pour l'anonyme.

Points écartés, et pourquoi :
- La clause `actor_user_id = auth.uid()` n'est **pas** une faille : les actions
  de sécurité (codes de secours) ont un `restaurant_id` NULL, sans elle leur
  auteur ne verrait jamais ses propres entrées. Aucun compte cuisine ou
  réception ne peut être `actor_user_id`.
- Pas de `grant insert` à `service_role` : les `revoke` ne visent que
  `anon` / `authenticated` / `PUBLIC`, `service_role` conserve ses privilèges
  par défaut.
- Pas de `grant select` sur `restaurants` : l'application l'interroge déjà
  depuis le client, le privilège existe.


---

## 🧭 Garde-fou « mauvais projet » sur les scripts SQL (05 novembre 2026)

`021_admin_security.sql` a été exécuté par erreur dans un projet Supabase qui
n'est pas celui de l'application. Aucune donnée existante n'a été touchée (les
deux tables créées étaient vides), mais rien n'empêchait la récidive.

- **`021` : contrôle préalable en tête de fichier.** Un bloc `RAISE EXCEPTION`
  vérifie la présence de `public.restaurants` et de sa colonne `owner_id` AVANT
  toute création : dans un mauvais projet, le script s'arrête net en indiquant
  l'URL d'API attendue, sans rien laisser derrière lui. Un `NOTICE` affiche la
  liste des restaurants du projet courant pour confirmation visuelle.
- **Tri sur `name` et non `created_at`** dans ce contrôle : seule l'existence de
  `name` est garantie par le code. Un tri sur une colonne absente aurait fait
  échouer tout le script pour une question d'affichage.
- **`021` : section de vérification** commentée en fin de fichier (tables,
  indexes, contraintes, policy attendus).
- **`docs/023_annuler_projet_errone.sql`** : nettoyage du projet erroné, avec
  un rappel de l'URL d'API du bon projet et un contrôle d'identité avant toute
  suppression.
- **`docs/ADMIN_SECURITE.md`** : l'étape 1 commence désormais par « être sûr
  d'être dans le bon projet ».

## Refonte de la page d'accueil (`src/pages/HomePage.jsx`)

La page d'accueil est entièrement reconstruite à partir d'une maquette validée
au préalable. Le design (navy #1F2A44 / or #C9A84C / crème #F7F3EB, Georgia +
Outfit) et toutes les animations sont conservés à l'identique.

- **Nouvelles illustrations.** Les anciennes captures d'écran brutes
  (`guide-*.jpg`, `guide-menu1.png`) sont remplacées par 13 illustrations WebP
  générées pour le besoin, dans le langage graphique des supports PDF de la
  marque : aplats, pas de texte lisible, fond navy et accents or. Poids total
  374 Ko contre 2,8 Mo avant.
- **Écran du téléphone en 9:14 partout.** L'ancienne règle
  `@media(max-width:940px){.screen{aspect-ratio:4/3}}` basculait le téléphone
  en paysage sur mobile et rognait les captures portrait en une fine bande.
  Le cadre épouse désormais exactement le format des images (aucun rognage) et
  le téléphone est borné à 340 px pour rester raisonnable en pleine largeur.
- **Cartes « Tout est inclus » centrées sur l'image** : visuel pleine largeur
  en 4/3, icône déplacée à côté du titre (elle recouvrait l'image), texte
  réduit à une seule ligne.
- **Grilles en mobile-first** : la bento et la nouvelle section partent d'une
  colonne, puis 2 ou 3 colonnes par `min-width` (au lieu de `max-width`).
- **Nouvelle section « Livraison & stock »** (3 visuels) : gestion de stock,
  côté restaurant, côté livreur. Un trait doré animé relie les deux cartes de
  la relation quand elles sont côte à côte.
- **Le sommaire est remplacé par « Le parcours »** (3 étapes reliées par un
  trait qui se trace au scroll) et **le footer est supprimé** : la page se
  termine sur l'appel à l'action.
- **Le rôle Livreur n'est pas ajouté** aux rôles existants : il est annoncé
  comme activable à la demande, pour les établissements qui livrent.
- **Performances** : `loading="lazy"` et `decoding="async"` sur toutes les
  images, attributs `width`/`height` sur les écrans du hero pour éviter les
  décalages de mise en page, compteurs animés via `requestAnimationFrame`,
  observateurs `IntersectionObserver` déconnectés après usage.
- **Lint** : le fichier passe à 0 erreur (le total du dépôt passe de 11 à 10).

## Performances de l'accueil : images allégées et mises en cache

Retour terrain : les illustrations se chargeaient lentement et certaines
n'apparaissaient pas du tout.

- **Images 2× trop grandes pour leur taille d'affichage.** Le téléphone du hero
  s'affiche à ~320 px et recevait du 768 px ; les cartes, entre 340 et 560 px,
  recevaient du 1100 px. Tout est redimensionné à ~1,5× la taille réelle
  (hero 480 px, cartes 720 px) avec une qualité ajustée image par image :
  **373 Ko -> 168 Ko (-55 %)**.
- **Aucune en-tête de cache sur `/images/`.** Les fichiers sans hash reçoivent un
  `must-revalidate` : chaque image faisait un aller-retour jusqu'à l'origine
  (région `cdg1`, Paris) avant d'être servie. `vercel.json` pose désormais
  `max-age=3600, stale-while-revalidate=86400` : le serveur périphérique répond
  immédiatement et revalide en arrière-plan.
- **Diaporama du hero.** La rotation avançait à intervalles fixes et tombait sur
  des écrans pas encore téléchargés — d'où les diapositives vides. Les 5 écrans
  sont maintenant préchargés et la rotation ne démarre qu'une fois décodés, avec
  un garde-fou de 4 s si le réseau ne répond pas.
- **Écran du hero préchargé** dans `index.html` (`<link rel="preload">`) : il est
  visible au premier affichage, inutile d'attendre le JavaScript.
- **Dimensions déclarées** sur toutes les images (`width`/`height`) pour
  supprimer les décalages de mise en page.
- **Correctifs `index.html`** : `lang="fr"` au lieu de `lang="en"` sur une page
  française, et un titre/description réels (« restaurant-mvp » était le nom du
  dépôt, pas celui du produit).

## Illustrations responsives (`srcset`) : netteté ET légèreté

Retour terrain : après l'allègement, les illustrations paraissaient compressées.
La cause est réelle — les images avaient été calées sur 1,5× leur taille
d'affichage, ce qui est insuffisant sur un écran 3× comme celui du test.

Plutôt que de choisir entre netteté et poids, chaque illustration existe
désormais en **trois largeurs** et le navigateur choisit lui-même en fonction de
la taille d'affichage **et** de la densité d'écran :

- écrans du hero : 400 / 560 / 768 px
- illustrations de cartes : 400 / 720 / 1100 px

L'attribut `sizes` indique la largeur réelle d'affichage, calculée pour chaque
disposition (bento 6 colonnes sur bureau, 2 colonnes dès 600 px, 1 colonne en
dessous ; téléphone borné à 340 px sur mobile). Sans `sizes`, le navigateur
suppose 100vw et télécharge systématiquement la plus grande variante.

**Poids réellement téléchargé** (avant : 168 Ko pour tout le monde) :

| Appareil | Hero | Cartes | Total |
|---|---|---|---|
| Mobile 3× (le cas du test) | 149 Ko | 187 Ko | 336 Ko |
| Mobile 2× | 94 Ko | 108 Ko | 202 Ko |
| Mobile 1× | 52 Ko | 53 Ko | **105 Ko** |
| Bureau 1× | 95 Ko | 108 Ko | 203 Ko |

Le préchargement du diaporama et le `<link rel="preload">` de `index.html`
utilisent `srcset` + `sizes`, donc le navigateur récupère la bonne largeur dès
le premier octet au lieu de la plus grande.

39 variantes au total ; `public/images` passe de 168 Ko à 700 Ko sur le disque,
mais aucun appareil ne télécharge plus de 336 Ko.

## Correction : les cartes de la grille faisaient 12 px de large

Symptôme : illustrations écrasées dans les cartes « Tout est inclus », en mobile
comme en bureau. Toutes les optimisations d'images n'y changeaient rien, et
pour cause — le problème ne venait pas des fichiers mais du CSS.

**Cause.** Les articles de la grille portaient les classes `w-3` et `w-2`. Or le
projet charge Tailwind (`@import "tailwindcss"` dans `src/index.css`), qui
scanne les fichiers JSX et génère ses utilitaires à la volée. `w-3` et `w-2`
sont des utilitaires Tailwind :

    .w-3 { width: calc(var(--spacing) * 3) }   -> 12 px
    .w-2 { width: calc(var(--spacing) * 2) }   ->  8 px

Ces règles générées s'appliquaient aux articles en plus de `grid-column`, dont
elles annulaient l'effet : chaque carte occupait bien sa place dans la grille,
mais ne mesurait plus que **12 px de large**, avec l'illustration compressée
dedans. La page utilisait donc des images de 1100 px pour les afficher sur
12 px.

**Correctif.** Renommage en `bento-wide` / `bento-narrow` : un préfixe explicite
qu'aucun utilitaire Tailwind ne peut produire. Un commentaire dans le CSS
documente le piège à l'endroit exact où il se trouve.

**Vérification.** Après reconstruction, plus aucune des 78 classes employées par
la page n'entre en collision avec une règle générée par Tailwind.

## Correction : hero et Pilotage decentres sur mobile

Deux sections sortaient de l'ecran sur telephone. Mesure relevee dans un
navigateur headless, viewport 390 px (contenu utile : 24 a 366).

**Le hero.** La piste de la grille etait ecrite `1fr`. Or `1fr` vaut
`minmax(auto, 1fr)` : la piste ne peut jamais descendre sous la largeur
min-content de son contenu. Le titre contient « simplement maitrise. » en
`white-space:nowrap` (c'est le mot barre d'un trait SVG anime), soit 396,3 px
au corps de 38,4 px. La colonne entiere — texte **et** telephone — se calait
donc sur 396,3 px et depassait de 30 px a droite a 390 px, de 60 px a 360 px.
Le diaporama du telephone partait vers la droite et se faisait rogner.

Deux corrections, complementary :
- `minmax(0,…)` sur les pistes, pour qu'elles soient reellement libres ;
- sous 560 px, corps du titre ramene a `min(2.4rem, 8vw)` pour que le bloc
  nowrap tienne dans la colonne (297 px a 360, pour 312 px disponibles).

**Pilotage.** Le tableau de bord etait, lui, bien centre, mais sa rangee de
trois tuiles debordait : `repeat(3,1fr)` ne pouvait pas descendre sous la
largeur du libelle « Commandes ». La rangee faisait 324,8 px pour 296 px de
cadre, soit 29 px de depassement — d'ou l'impression de bloc de travers.
Passe en `minmax(0,1fr)` et resserree sous 420 px (marge,padding et corps
reduits).

**Effets de bord corriges au passage**, trouves par le meme releve :
- barre de navigation : a 390 px les deux boutons ne tenaient plus a cote de la
  marque, « Demander une demo » sortait de 87 px. Le bouton est masque sous
  560 px (le hero juste en dessous porte le meme) et « Se connecter » reste.
  Entre 861 et 1024 px, ce sont les liens d'ancrage qui poussaient les boutons
  dehors : masques sous 1024 px.
- les pastilles volantes du hero, ancrees en `right:-48px`, etaient coupees net
  entre 1101 et 1228 px : masquees sous 1280 px.

**Verifie** en navigateur headless de 320 a 1440 px (13 largeurs) : plus aucun
element ne depasse les bords de l'ecran, et sur toute la plage mobile
(320 a 768) le hero comme Pilotage sont exactement a egale distance des deux
bords.

## Lisibilite du mode sombre : contraste garanti pour toutes les couleurs de marque

Le mode sombre existait deja (useTheme + theme.js), mais sa lisibilite
dependait de la couleur choisie par chaque restaurant. Deux defauts mesures.

**1. La teinte des surfaces etait brouillee.** generateDarkTheme calculait
`blendedHue = (230 + h * 13.01) % 360`. Ce coefficient agit comme une fonction
de hachage : une variation minime de la couleur de marque donnait une teinte
sans rapport. Un primaire magenta produisait une carte olive (#57603e), un
primaire jaune une carte vert-jaune tres claire. Rien ne garantissait donc la
luminosite des fonds.

Remplace par une inflexion bornee vers le bleu-marine de reference :
`230 + plusCourtEcart(h, 230) * 0.18`, soit au plus ~32 degres d'ecart. Les
surfaces restent sombres et coherentes quelle que soit la marque.

**2. Les fonds n'etaient jamais verifies.** Ajout de `contrastRatio` (WCAG) et
de `ensureContrast`, qui assombrit une surface jusqu'a ce que les textes
atteignent 4,5:1. Le contraste ne depend plus d'un reglage manuel : il est
garanti par construction, pour n'importe quelle couleur.

`textMuted` passe de #8B92A8 a #A8AFC4 : l'ancienne valeur plafonnait a 3,28:1
sur fond de carte, sous le seuil AA de 4,5:1.

**Mesures, sur fond de carte, en balayant 18 teintes de marque :**

    avant : blanc 6,67 | secondaire 4,16 | discret 2,15   (7 teintes sur 18
            faisaient tomber le texte secondaire sous 4,5:1 ; le texte discret
            echouait systematiquement)
    apres : blanc 9,92 | secondaire 6,19 | discret 4,53   (18/18 conformes)

Les memes mesures sur le fond de page : 13,12 / 8,19 / 6,00.

La cause restante — des couleurs codees en dur dans les pages plutot que le
theme — n'est pas traitee ici : elle demande une passe par composant.

## Module inventaire / stock

L'inventaire manquait, alors que la page d'accueil l'annonce : la section
« Livraison & stock » promet « Suivez vos quantites en direct et soyez alerte
avant la rupture ». C'etait donc une promesse non tenue — le premier ecart
visible des le test en salle.

**Base (docs/024_inventaire.sql, a executer dans Supabase).**

- `stock_items` : un article par restaurant (nom, unite, quantite, seuil
  d'alerte, cout, plat associe et quantite consommee par portion).
- `stock_movements` : le journal de chaque entree et sortie, avec le motif
  (commande, achat, ajustement, perte, stock initial).
- `consume_stock_for_order()` : decremente le stock quand une commande est
  servie, d'apres `orders.items` (JSON `[{id, name, price, qty}]`).
- RLS : tout le personnel du restaurant consulte ; seuls admin, reception et
  le proprietaire ecrivent. La cuisine consulte mais ne corrige pas les
  quantites.

Deux robustesses deliberées, parce qu'une erreur de stock ne doit jamais
bloquer un service en cours : la consommation est **idempotente** (un index
unique et une verification explicite empechent de decrementer deux fois la
meme commande), et la fonction est enveloppee dans un bloc d'exception qui
renvoie 0 sans propager l'erreur. L'identifiant du plat est de plus valide par
une expression reguliere avant conversion : un ancien identifiant malforme ne
peut pas faire echouer le declencheur, donc la mise a jour du statut.

**Page (/inventaire, protegee par AdminRoute).**

Ecrite contre deux travers du code existant :

1. Styles en classes CSS avec media queries au lieu de `style={{...}}` en
   ligne. Un style en ligne ne peut pas reagir a la largeur de l'ecran — c'est
   pourquoi Dashboard, Settings et MenuManager ne sont pas responsives. Base
   mobile, elargissement a partir de 700px.
2. Aucune couleur en dur : tout vient de `useTheme`, donc le mode sombre reste
   lisible quelle que soit la couleur de marque.

Les classes sont prefixees `inv-` pour qu'aucune ne puisse entrer en collision
avec un utilitaire Tailwind (les cartes de la page d'accueil etaient tombees a
12px a cause de `w-3` / `w-2`).

Si les tables n'existent pas encore, la page affiche une consigne expliquant
d'executer le script SQL, au lieu de rester blanche.

## Correction 42725 — ambiguite is_restaurant_staff

Premier lancement du script : `ERROR 42725: function public.is_restaurant_staff(uuid)
is not unique`. Le script creait sa propre version de cette fonction d'aide, qui
doublonnait une surcharge deja presente en base : deux candidats pour un appel a
un seul argument, Postgres refuse de choisir.

Le script ne depend plus d'aucune fonction d'aide. Les conditions RLS sont
ecrites en ligne (exists() sur restaurant_staff et restaurants.owner_id) : il
s'installe quelle que soit l'histoire du schema, et ne cassera pas au prochain
ajout de surcharge. Le nommage des parametres existants n'est plus une
hypothese.

Un bloc de nettoyage en tete supprime la surcharge laissee par l'execution
avortee, mais seulement s'il s'agit bien de la notre (parametre nomme
p_restaurant) et s'il en reste une autre. Le script est rejouable tel quel.

Raisonnement tenu sur le risque du drop : l'application fonctionne aujourd'hui,
donc aucune politique existante n'etait ambigue avant. La surcharge a un
argument est donc bien nouvelle, donc bien la notre.

## Recettes : un article partage entre plusieurs plats

Question de depart : « quelle est la relation entre le menu et l'inventaire,
si les deux ne jouent pas le meme role ? » La reponse tient en une phrase —
un plat est une promesse faite au client, un article de stock est une
ressource physique. On ne « vend » pas 200 g de poulet, on vend un poulet
braise qui consomme 200 g de poulet. Le lien entre les deux, c'est la recette.

Mais le lien livre en 024 etait une impasse : une colonne menu_item_id sur
stock_items, donc UN article rattache a UN seul plat. Or le meme poulet sert
dans trois plats. Il aurait fallu creer trois lignes « Poulet », chacune avec
son propre stock — le total affiche aurait ete faux. C'est exactement le genre
d'erreur qui fait perdre confiance dans un inventaire, et c'etait notre sujet.

docs/025_recettes.sql cree menu_item_recipes(menu_item_id, stock_item_id,
quantity_per_serving) : une vraie recette plusieurs-a-plusieurs. Les liens
deja saisis sont repris automatiquement, puis l'ancienne colonne est retiree —
deux mecanismes concurrents finiraient toujours par se contredire.

La consommation lit desormais la recette plutot que la colonne. Le
declencheur, lui, ne change pas : il appelle la fonction, seul son contenu
bouge.

Cote page, chaque fiche article liste les plats qui le consomment avec leur
portion, et permet d'en ajouter ou d'en retirer. Lier un plat n'est plus un
champ du formulaire de creation mais une action sur l'article : un article
existe avant d'etre rattache a une recette, et peut servir a plusieurs plats.

Le message « aucun plat lie » est affiche explicitement, pour qu'un article
non rattache ne passe pas pour un article dont le stock ne bouge pas par
erreur.

## Responsive de la page Parametres

Premiere page traitee dans la mise a niveau responsive des pages internes.

Le diagnostic n'etait pas celui qu'on attendait. Les 24 « largeurs fixes »
reperees au comptage etaient en fait des width:100%, donc deja fluides. Le
defaut reel : une colonne de 480px centree qui ne grandissait jamais, meme sur
un ecran large. Le probleme n'etait donc pas le debordement, mais l'espace
perdu sur desktop.

D'ou le choix de ne pas tout reecrire : 130 styles en ligne, dont une centaine
uniques, et aucune verification visuelle possible de mon cote. Reecrire 700
lignes de JSX a l'aveugle etait le meilleur moyen de casser une page qui
marche. Seuls les motifs qui bloquent reellement la mise en page sont devenus
des classes : 7 cartes, 4 libelles, 2 champs, les deux conteneurs.

Les couleurs restent pilotables par le theme malgre les classes : elles
passent par des variables CSS posees une seule fois sur la page. Mode sombre et
couleur de marque fonctionnent comme avant.

Le conteneur EST la grille, plutot que d'envelopper les cartes dans un div
supplementaire : cela evite la reindentation de 700 lignes pour un resultat
identique. Les elements .adm-full (message, deconnexion) occupent toute la
largeur.

Deux details qui comptent : min-width:0 sur les cartes, sans quoi une adresse
e-mail ou un jeton d'invitation etire la piste de la grille et declenche un
defilement horizontal ; et overflow-wrap:break-word, pour qu'un mot plus long
que sa carte se coupe au lieu de deborder.

Base mobile, deux colonnes a partir de 700px, plafond a 1120px.

L'erreur de lint restante (setMessage dans un effect) est preexistante.

## Parametres decoupes en sections selon le profil

Reponse a « pourquoi ne pas le faire en section propre en fonction du role
defini ? ». C'etait la bonne question, et pour une raison concrete : un compte
reception ouvrait les memes reglages que le proprietaire, alors que le RLS lui
refuse l'ecriture. Il voyait donc des sections qui echouent sans qu'il
comprenne pourquoi.

Deux faits ont borne la conception, decouverts en lisant le code :

1. Deux profils seulement atteignent cette page. La cuisine est arretee en
   amont par RoleGuard, et il n'existe pas de role staff « admin » dans ce
   projet : STAFF_ROLES ne contient que reception et cuisine.
2. Le provider n'expose pas le role, seulement isOwner.

La matrice est donc reduite : proprietaire et reception. L'interet n'est pas
dans une matrice complexe mais dans la lisibilite — une regle d'acces ecrite
une fois, au lieu de isOwner && disperse a quatre endroits du JSX. Ajouter un
profil futur (un role livreur, par exemple) se limite a une ligne du tableau.

Quatre sections :
  - Compte et abonnement : tous
  - Presentation de l'etablissement : proprietaire
  - Securite : tous
  - Equipe : proprietaire

Chaque section est sa propre grille : les cartes d'un meme theme restent
ensemble, et deux sujets sans rapport ne se retrouvent jamais cote a cote.
C'est aussi la reponse a la remarque soulee au commit precedent sur le
regroupement des cartes en deux colonnes.

La garde redondante de « Mots de passe de l'equipe » a ete retiree : la section
entiere est deja reservee au proprietaire, et deux gardes qui se recouvrent
finissent toujours par diverger.

## Responsive de l'Historique, et feuille de style partagee

L'Historique presentait exactement le meme defaut que les Parametres : une
colonne de 640px centree qui ignorait l'ecran large, et jusqu'a 50 cartes de
commandes empilees les unes sous les autres.

C'etait la deuxieme page a avoir besoin du meme traitement. Plutot que de
dupliquer la feuille de style, elle est sortie de Settings.jsx pour devenir
src/lib/adminCss.js. Les deux pages l'importent desormais.

Le contrat est documente en tete du fichier : une page qui utilise cette
feuille pose les variables CSS (--adm-page, --adm-card, --adm-text,
--adm-text-2, --adm-border, --adm-primary, --adm-accent) une seule fois sur son
element racine. Le theme et le mode sombre continuent de s'appliquer, puisque
les classes ne contiennent aucune couleur en dur.

Coté Historique :
- la liste des commandes devient une grille : une colonne sur mobile, deux a
  partir de 700px, trois a partir de 1180px. Ce sont des cartes courtes et
  repetitives, elles supportent la densite — contrairement a un formulaire.
- le bloc « total encaisse » devient .adm-hero. Sa couleur d'accent passe par
  --adm-accent plutot qu'en #C9A84C dur : le doré etait ecrit en dur alors que
  la couleur secondaire est configurable par restaurant.
- les lignes article passent par .adm-line (flex-wrap + min-width:0), pour
  qu'un nom de plat long ne pousse pas le prix hors de l'ecran.

Un point de vigilance : le build passait alors que ADMIN_CSS n'etait pas
importe dans Settings. Undefined n'est pas une erreur de compilation mais une
erreur a l'execution — la page aurait plante. Seul le lint l'a attrape. D'ou
l'interet de le faire tourner systematiquement, et pas seulement le build.

## En-tete commun : Retour a gauche, theme a droite, sur toutes les pages

Le bouton « Retour » et l'interrupteur de mode sombre etaient reconstruits a la
main dans chaque page. Sur l'Historique, les Parametres et l'Inventaire, Retour
etait a gauche. Sur MenuManager, les deux etaient a droite. Et sous 430px, un
menu burger les faisait disparaitre. D'une page a l'autre, le meme bouton
changeait donc de place.

src/components/PageHeader.jsx fixe la regle une fois : Retour est toujours le
premier element a gauche, l'interrupteur de theme toujours le dernier a droite.
Les actions propres a une page se glissent entre les deux, sans jamais
deplacer les deux bouts.

Le detail qui tient la promesse : flex-wrap:nowrap avec min-width:0 sur le
groupe de gauche. Le titre se comprime et tronque avec une ellipse, mais ne
pousse jamais le bouton de theme hors de sa place. Sous 430px, le libelle
« Retour » disparait pour garder la place — le bouton reste ou il est.

Le menu burger de MenuManager est remplace par une action d'en-tete
permanente. Il cachait « Ajouter un plat » : en dessous de 430px, on ne
pouvait plus ajouter de plat. L'action est maintenant visible a toutes les
largeurs, a une place previsible.

src/components/PageLoader.jsx fait la meme chose pour les ecrans de
chargement. Chaque page ecrivait le sien, avec son fond et sa couleur de
texte : le passage du chargement a la page provoquait un saut visuel. Le
composant utilise les memes variables et la meme feuille de style que les
pages, donc le fond ne bouge plus.

adminCss.js exporte aussi adminVars() : toutes les pages posent exactement les
memes variables, au lieu de recopier huit lignes dont une finissait toujours
par diverger.

Converti : Historique, Inventaire, Parametres, MenuManager (ses deux en-tetes).

## Sessions : un seul appareil actif par compte, sous verification 2FA

Regle decidiee : quand un second appareil se connecte, l'ancien est deconnecte,
MAIS seulement apres verification de la double authentification. Sans cette
verification, une personne ayant vole un mot de passe pourrait evacuer le
proprietaire legitime de son propre compte — ce serait une prise de controle
offerte a l'attaquant, pas une protection.

Repartition des roles, qui est le point important du dispositif :

  - docs/026_sessions.sql ne fait que DETECTER et JOURNALISER. Ce n'est pas une
    barriere de securite : y ecrire ne deconnecte personne.
  - la revocation reelle est faite par api/sessions/revoke-others.js via
    auth.admin.signOut(jwt, 'others'), qui invalide les jetons de
    rafraichissement. Supabase reste la source d'autorite.
  - la regle 2FA est appliquee COTE SERVEUR (requireAal2IfEnrolled). L'exiger
    dans le client n'aurait aucune valeur : le client est contournable.

Consequence voulue : si la table est vide ou fausse, on perd la detection, pas
la securite.

Fenetre d'activite de 5 minutes pour un battement toutes les 60 secondes. Sans
fenetre, un appareil reste actif eternellement des qu'on ferme un onglet — rien
ne previent le serveur — et le proprietaire se voit reclamer un code a chaque
reconnexion sur son propre telephone. Deux battements peuvent se perdre sans
fausse alerte.

Cas traite explicitement : si le compte n'a PAS active la 2FA, on ne peut rien
exiger de plus et on evince quand meme. Refuser reviendrait a enfermer dehors
le proprietaire qui a perdu son telephone. Un message l'invite a activer la 2FA.

L'appareil evince est prevenu par deux signaux redondants : le 401 renvoye par
l'API (jetons revolues, le plus sur car il vient de Supabase), et le drapeau
revoked de la table (filet si les jetons sont encore valides).

## 027 : une seule version de is_restaurant_staff

Cette base possede plusieurs surcharges de is_restaurant_staff, apparues en
dehors des migrations du depot — verifie : aucune migration 018 a 023 ne la
cree. D'ou l'erreur 42725 rencontree a l'installation de l'inventaire.

Le script se REFUSE a agir s'il trouve un appel a plus d'un argument quelque
part : Postgres ne trace pas les dependances entre une fonction et les
politiques RLS qui l'appellent, donc supprimer une surcharge casserait ces
appels a l'execution, silencieusement. Mieux vaut avorter que casser.

## Suppression d'express, seule source de l'avertissement url.parse()

Un avertissement remonte par les journaux Vercel :
  DEP0169 DeprecationWarning: url.parse() behavior is not standardized and
  prone to errors that have security implications.

Ce n'est pas une erreur — rien n'etait casse — mais url.parse() est
effectivement deconseille, donc la source a ete cherchee.

Verdict : url.parse() n'apparait dans aucun fichier de src/ ni de api/. Un seul
fichier de tout node_modules l'appelait : express/lib/request.js. Et express
n'etait importe nulle part dans le projet — aucune occurrence, ni dans le code
ni dans les scripts npm. Dependance morte, arrivee avec la fusion #2.

Sa suppression retire 65 paquets (183 -> 121 dans node_modules).

A noter : si l'avertissement revenait apres deploiement, il viendrait alors de
l'environnement d'execution Vercel lui-meme (le journal indique node:8, soit
l'amorcage du runtime), et non de notre code — nous n'y pouvons rien.

Le lint reste a ses 10 erreurs preexistantes, toutes dans les paiements,
ReceiptModal, Dashboard et Settings. Aucune dans le code des sessions.

## Regroupement des endpoints de sessions (limite Vercel Hobby)

Le deploiement a echoue : « No more than 12 Serverless Functions can be added
to a Deployment on the Hobby plan. »

Le projet comptait 11 fonctions. Les trois endpoints de sessions (claim,
heartbeat, revoke-others) faisaient monter le compte a 14.

Ils sont regroupes en une seule route, api/sessions.js, qui dispatch sur un
champ `action`. Le regroupement ne coute rien ici : ces trois actions servent
le meme appelant, au meme moment, et partagent la meme authentification. On
retombe a 12, soit pile la limite — aucune marge.

Deux pistes pour liberer de la place, non tranchees car ce sont des choix qui
appartiennent au metier :
  - api/webhooks/yabetoo-debug.js : 13 lignes, simple renvoi vers
    yabetoo-subscription.js, etiquete « route legacy ». A verifier cote
    configuration Yabetoo avant suppression — une URL de webhook y pointe
    peut-etre encore.
  - api/check-test-session.js : outil de reconciliation temporaire, dont
    l'en-tete indique lui-meme « pas destine a rester en prod tel quel ».

A noter : regrouper trois fonctions internes derriere un `action` est acceptable
pour un ensemble coherent comme celui-ci, mais generalise a tout le projet cela
deviendrait un plat de spaghettis. La limite Hobby finira par se payer : soit
en passant a une equipe (plan Pro), soit en supprimant les routes devenues
inutiles.

## Tableau de bord : sortir de la bande de 640 px

La page etait ecrite ENTIEREMENT en styles en ligne : 86 blocs style={{}}. C'est
la cause racine, et elle explique tout le reste.

    Un style en ligne ne peut pas porter de media query.

Les zero media query du tableau de bord n'etaient donc pas un oubli : c'etait
structurellement impossible. Et le conteneur racine etait

    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "28px 18px" }}>

soit une bande de 640 px centree au milieu d'un grand ecran, avec tout empile
dedans. D'ou l'impression d'une application mobile.

Seuls les SEPT conteneurs structuraux sont convertis en classes db-. Les 86
styles decoratifs (couleurs, polices) restent en ligne : les convertir
n'apporterait rien et ferait courir un risque pour rien.

Grandeurs retenues :

                     mobile    >=700px    >=1180px
    conteneur         640px     1120px     1320px
    commandes         1 col     2 col      3 col
    annulees          1 col     2 col      3 col

Les seuils 700 et 1180 sont ceux de la feuille partagee adminCss.js. J'avais
d'abord mis 760 et 1200 : deux pages qui changent de forme a des largeurs
differentes donnent une navigation bancale en passant de l'une a l'autre.

Trois details :
  - les trois chiffres du jour forment une bande a separateurs verticaux ; sans
    eux les valeurs flottaient sans repere ;
  - le bouton « Voir l'historique » est borne a 420 px, sinon il s'etirait sur
    1320 px ;
  - align-items:start sur les grilles : une carte garde sa hauteur propre au
    lieu de s'etirer sur celle de sa voisine.

A savoir : avec peu de commandes, une grille laisse du vide a droite, une carte
occupant une piste entiere. C'est le comportement normal d'une grille.

## Suppression manuelle des liens d'invitation (Settings)

Le proprietaire peut desormais supprimer un lien d'invitation depuis
Parametres -> Equipe, et pas seulement en generer.

Deux points qui meritent d'etre relus :

1. LA POLITIQUE RLS N'EXISTE NULLE PART DANS LE DEPOT. La table
   staff_invitation_tokens n'apparait dans AUCUNE migration du depot — comme
   is_restaurant_staff, elle a ete creee hors depot, dans l'editeur. Ses
   politiques ne sont donc pas tracables ici. docs/028 ajoute la politique de
   suppression.

   Piege evite : sans politique, un bouton « Supprimer » n'aurait renvoye
   AUCUNE ERREUR. Postgres ne refuse rien, il ne supprime simplement aucune
   ligne. En RLS, l'absence d'erreur n'est pas un succes. D'ou le controle
   explicite sur le nombre de lignes annoncees par le .select("id") : si rien
   n'est revenu, on affiche qu'il faut executer docs/028, au lieu de laisser
   croire a une suppression reussie.

2. PROPRIETAIRE SEULEMENT. Un lien d'invitation donne acces au restaurant :
   savoir qui peut le revoquer est une decision de securite, pas une commodite.
   La generation est deja reservee au proprietaire ; la suppression suit la
   meme regle, celui qui ouvre la porte est celui qui la referme. Les roles
   admin et reception sont volontairement exclus.

Confirmation en deux temps plutot qu'un window.confirm : supprimer un lien
non encore utilise coupe l'acces d'un membre en cours d'arrivee. Le premier
clic demande « Sur ? », le second confirme.

## Ecran cuisine : sortir de la bande de 640 px

Meme cause racine que le tableau de bord — tout en styles en ligne, donc aucune
media query possible — et meme conteneur bloque a 640 px. Trois conteneurs
structurels convertis en classes kt-.

     mobile      >=700px     >=1180px     >=1600px
     640px       1120px      1320px       1720px
     1 col       2 col       3 col        4 col

La quatrieme colonne au-dela de 1600px n'est pas un luxe : une cuisine affiche
souvent sur un grand ecran ou un television, et c'est precisement la que la
bande de 640px etait la plus absurde.

## Console super-administrateur : 960 px, zéro media query

Conteneur a 960px, aucune media query, tout en styles en ligne : memes causes
que le tableau de bord et la cuisine. Trois conteneurs convertis en classes sa-.

     mobile      >=700px     >=1180px    >=1400px
     960px       1120px      1320px      1320px
     1 col       2 col       2 col       3 col

La troisieme colonne n'arrive qu'a 1400px, et c'est voulu : les cartes
restaurant sont denses (nom, plan, statut, quatre boutons d'action, resultat
des ventes). A 1320px sur trois colonnes, chaque carte tombe a 440px et les
boutons d'action se chevauchent.

## Inventaire : 960 px -> 1320 px, et correction d'un doublon de responsabilite

Conteneur elargi de 960px a 1120px (>=700px) puis 1320px (>=1180px). La liste
d'articles passe a deux colonnes (>=700px) puis trois (>=1400px).

Correction de fond au passage : .inv-list ET chaque .inv-item se declaraient
tous deux en « flex column ». La mere et les enfants portaient donc la meme
responsabilite du flux, ce qui est redondant et rend l'ensemble difficile a
lire. Desormais la liste est une grille qui place ses enfants ; les enfants se
contentent d'arranger leur propre interieur, qui est deja en rangees
(.inv-item-main, .inv-item-actions).

La troisieme colonne attend 1400px : les cartes d'articles sont denses (nom,
jauge de seuil, actions, recette liee).

## Gestionnaire de menu : deux corps de page de 900 px

La page comporte DEUX rendus distincts (vue categories, vue plats), chacun avec
son propre corps bloque a 900 px et ses styles en ligne. La feuille est donc
injectee deux fois, a cote de ADMIN_CSS dans les deux.

Quatre conteneurs convertis en classes mm- : les deux corps, la liste des plats
et la grille des categories.

Deux points de jugement :

1. La liste des plats passe a deux colonnes, pas trois. Les cartes de plat sont
   denses (nom, prix, description, boutons d'action) ; une troisieme colonne les
   ecraserait.

2. La grille des categories etait deja en auto-fill(minmax(155px,1fr)) — donc
   deja fluide. Mais a 155px de plancher, un ecran de 1320px aligne HUIT tuiles
   par rangee et les rend minuscules. Le plancher monte a 190px (>=700px) puis
   215px (>=1180px) : la grille reste fluide sans rapetisser ses tuiles.

La modale d'ajout de plat reste a 480px, volontairement : c'est une feuille
montee depuis le bas, pas une page.
