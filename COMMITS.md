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
