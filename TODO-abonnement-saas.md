
/
Gigital System
Gigital System
Transformer les spectateurs en operateurs









Épinglé
Masquer
Enregistrement des nouveaux restaurants via Supabase
il y a 1 minute
État complet du flux commande et abonnement SaaS
il y a 7 heures
Erreurs de build et remplacements d'icônes
il y a 5 jours
Fichiers restants à mettre à jour
27 juil.
Intégration API mobile Money dans un MVP restaurant
23 juil.
MVP restaurant: priorités de développement
20 juil.
MVP restaurant : discipline et focus sur la réduction d'attente
14 juil.
Instructions
- Sur chaque conversation nouvelle ou ancienne concernat l'intégration de l'abonnement réfères toi au contexte /abonnement-saas-md et de tes dernières reponses

Mémoire
Vous uniquement
Purpose & context Jesusnet is the sole technical creator and super-admin of Le Bourgeois, a multi-tenant B2B SaaS restaurant management platform targeting restaurants in Central Africa (primarily Congo-Brazzaville), using FCFA as currency. A business partner contributes market access and client relationships (premium restaurant structures); all technical operations are handled exclusively by Jesusnet. The platform supports three roles — owner (propriétaire), reception, and kitchen — with fully isolated per-tenant data via restaurantid as the universal pivot key. Tech stack: React + Vite, Supabase (PostgreSQL + RLS + Realtime + Storage + Auth), Vercel deployment, TailwindCSS v4, React Router, lucide-react (exclusively — no emoji, no other icon libraries). Revenue model: ~40,000–55,000 FCFA/month per premium client, direct partner sales (no decoy tiers). Free tier available for smaller independent onboarders. Design reference: SuperAdmin.jsx — generous padding (28–32px), 20px card gaps, rounded corners (16–24px), Georgia serif non-bold headings, content/action visual separation. All pages must conform to this standard. Working principle: "Manuel d'abord, on automatise si ça se justifie." One file or migration at a time; execute and confirm before proceeding; no speculative code; destructive operations require inventory verification first. --- Current state Migrations: SQL migrations 004–013 confirmed executed. Migration 014restaurantregistrationtokens.sql written and ready to execute (pending confirmation before the accompanying SECURITY DEFINER RPC is written). Architecture confirmed: restaurantregistrationtokens table: dedicated table (separate from staffinvitationtokens) for new tenant creation via /register/:token. RLS enabled; super-admin-only direct access; anonymous/authenticated access blocked — all public registration flows go through a SECURITY DEFINER RPC (next step to write). staffinvitationtokens table: for adding staff to an existing restaurantid. Confirmed deployed with expiresat default corrected via ALTER TABLE. usestaffinvitationtoken RPC: confirmed deployed and functional. No separate tables entity in schema — physical table identification lives in ordersessions columns; QR codes encode restaurantid directly. publicordertracking is a VIEW, not a base table. Tables with restaurantid columns: menucategories, menuitems, ordersessions, orders, ordersarchive, restaurantstaff, staffinvitationtokens, subscriptionevents, subscriptionpayments, restaurants. Test restaurant: Rêve Voilé (b0b0b0b0-0000-0000-0000-000000000001), owned by jesusnetng@gmail.com, status active. All other test restaurants (including duplicate "Obrigado" entries) have been deleted via atomic CTE chain. Auth user cleanup handled via Supabase Dashboard (Authentication → Users). Frontend files — state as of last confirmed session: StaffOnboarding.jsx (route /staff-onboarding/:token): built and pushed. Settings.jsx: rebuilt staff invitation section (role selector, token generator, invitation list with copy-link); harmonized colors (no hardcoded #8B0000; navy #1F2A44 as fallback; brand.secondarycolor for header label). MenuManager.jsx and Settings.jsx: fixed ownerid bug — now use restaurantId via useSubscription(); isOwner gates on all write actions. SubscriptionProvider.jsx: resolves restaurant via ownerid first, then restaurantstaff (role=reception) fallback; exposes restaurantBrand, isOwner, additional brand fields. Tâche 12 UX pass: Menu.jsx ✅ (all emojis replaced, spacing/rounding updated, pushed). Dashboard.jsx, Settings.jsx, MenuManager.jsx, History.jsx, Tracking.jsx, Kitchen.jsx, AdminInvite.jsx — not yet done. Next page: Dashboard.jsx (also absorbs task 11: responsive trial/suspended banners). Pending git confirmations: Push status of StaffProvider.jsx, theme.js, AdminInvite.jsx has never been reconfirmed — treat as uncertain. Settings.jsx/MenuManager.jsx/AdminInvite.jsx push from the ownerid fix session also never reconfirmed (task 10). Resolved bugs (do not reopen unless confirmed reappearance with exact error): "null value in column orderid of relation orderstatushistory" on "Marquer soldée" — confirmed fixed by Jesusnet; root cause not isolated; closed. 403 on anonymous orders inserts — confirmed resolved at session start of most recent session. Recursive RLS infinite loop between restaurants and restaurantstaff — resolved via migrations 012→013 using SECURITY DEFINER helper functions isrestaurantowner() and isrestaurantstaff(). --- On the horizon Chantier A — Public landing page: / → static product vitrine only (no demo menu, no account required) /register/:token → validates registration token, creates restaurant tenant + first owner via SECURITY DEFINER RPC (not yet written — immediate next step after migration 014 is confirmed) /login → unchanged, public Token generation: manual SQL by Jesusnet only (no UI generator planned) Premium tenant creation overall: manual via Supabase SQL Editor, no super-admin GUI planned Remaining Tâche 12 pages (suggested order by visibility/usage): Dashboard.jsx → Settings.jsx → MenuManager.jsx → Tracking.jsx → Kitchen.jsx → AdminInvite.jsx Task 10: Confirm push status of Settings.jsx, MenuManager.jsx, AdminInvite.jsx (ownerid fix session) Task 11: Responsive trial/suspended banners — to be merged into Dashboard.jsx Tâche 12 pass Payment integration (non-priority, blocked): CinetPay requires RCCM (commercial registration number) pending partner contractualization. Phases 2/3/4/5/5bis/5ter of subscription roadmap remain non-priority until unblocked. --- Key learnings & principles transitionorderstatus RPC is the single source of truth for all order status transitions. The "paid" branch does INSERT into ordersarchive + DELETE from orders — not UPDATE — so the AFTER UPDATE trigger trglogorderstatuschange does not fire on it. This is by design. Super-admin role: Stored in JWT appmetadata.role (not a profiles table), set manually in Supabase Dashboard. Front-end check: user.appmetadata.role === 'superadmin' (via SuperAdminRoute.jsx). RLS check: (auth.jwt() -> 'appmetadata' ->> 'role') = 'superadmin'. Never confuse with the top-level JWT role claim (reserved for authenticated/anon/servicerole). restaurantregistrationtokens vs staffinvitationtokens: Deliberately separate tables. Registration creates a new tenant + first owner. Staff invitation adds a user to an existing restaurantid. Operations differ fundamentally; do not conflate or reuse. Supabase connection pooling (pgbouncer): Temp tables created in one statement are invisible to subsequent statements due to connection reassignment. Solution: restructure multi-step DELETE scripts as single atomic CTE chains using WITH ... RETURNING 1 pattern — avoids BEGIN/COMMIT split-session risks entirely. Image upload debugging: A bucket created via direct SQL INSERT (not the Storage API) ends up in a broken internal state — Storage returns 404 even though the row exists in storage.buckets. Always create buckets via Dashboard UI or Storage API. Multi-tenant test isolation: Browser localStorage is shared across tabs — different role accounts on the same machine merge into one session. Use separate browser profiles or distinct browser applications per role for accurate multi-tenant testing. RLS recursive loops: Policies on restaurants that reference restaurantstaff (and vice versa) create infinite recursion. Use SECURITY DEFINER helper functions to break the cycle. Vercel cron limitation: Hobby plan limits native cron to once daily. Use GitHub Actions for more frequent reconciliation cron jobs, calling Vercel serverless functions protected by CRON_SECRET header. MaxiCash: Do NOT use as a Congo-Brazzaville fallback. Its confirmed base of operations is Kinshasa (DRC). The only Brazzaville mention found was in an unreliable third-party directory. Requires direct verification with their commercial team before any mention. CinetPay: Primary confirmed payment option for Congo-Brazzaville. Requires RCCM for merchant account. Flexpay/MeSomb are secondary options to explore if needed. --- Approach & patterns Confirmation-driven, sequential: Claude delivers one file or migration → Jesusnet executes and confirms → next step proceeds. No speculative code or ahead-of-confirmation delivery. Complete files only: Full drop-in rewrites, never partial snippets without exact file location specified. Manual-first automation: No GUI or automation added until volume justifies it. Super-admin operations (tenant creation, token generation, subscription overrides) stay as manual SQL. Destructive operations: Always inventory first, provide atomic execution script second. Language: French for all communication and file comments. Tracking documents: COMMITS.md (canonical ground truth of what is built and tested), TODO-abonnement-saas.md, TODO-flux-commande.md. Memory/synthesis updated after each confirmed success. Session start ritual: Full state review before any new work begins. --- Tools & resources Stack: React + Vite, Supabase (PostgreSQL, RLS, Realtime, Storage, Auth), Vercel, TailwindCSS v4, React Router, lucide-react Deployment: Vercel — confirmed production domain: restaurant-mvp-jesus-net-s-projects.vercel.app (not restaurant-mvp.vercel.app, which belongs to a different application) Serverless functions: api/ at project root (not inside src/); plain Node.js globals (process.env without imports); separate ESLint override block required for api/ folder CI/CD: GitHub Actions (for cron jobs exceeding Vercel Hobby plan limits) Dev environment: Windows / PowerShell Auth user cleanup: Supabase Dashboard (Authentication → Users) for manual removal; Admin API Node.js script available as future automation alternative

Dernière mise à jour il y a 5 heures

Contexte

# CONTEXTE IA — ÉVOLUTION DU PROJET RESTAURANT
531 lignes

text



TODO-flux-commande.md
117 lignes

md



TODO-abonnement-saas.md
148 lignes

md



COMMITS.md
104 lignes

md


TODO-abonnement-saas.md


# Todo — Abonnement SaaS Le Bourgeois (build-once, zéro intervention manuelle)
 
Philosophie retenue : tout est câblé une seule fois. Après build, le seul signal visible est le
dashboard super-admin qui s'incrémente en mode payé. Aucune relance, aucun blocage, aucune
activation ne passe par une action manuelle de votre part.
 
---
 
## Phase 0 — Schéma de base (fondation, tout dépend de ça)
 
- [ ] Table `restaurants` — ajouter les colonnes :
  - `plan` (`free` | `pro`)
  - `subscription_status` (`trial` | `active` | `grace_period` | `suspended`)
  - `trial_start_at`, `trial_end_at` (auto-remplis à la création du restaurant, +30 jours)
  - `next_billing_date`
  - `custom_domain` (nullable)
  - `partner_id` (nullable — pour attribuer un restaurant au réseau du partenaire)
- [ ] Table `subscription_payments` — `restaurant_id`, `amount`, `provider`, `transaction_id`,
      `status`, `billing_period_start`, `billing_period_end`
- [ ] Table `partners` — `id`, `name`, `commission_rate` (ex: 0.40), `contact`
- [ ] Trigger Postgres : à l'insertion d'un nouveau `restaurant`, auto-remplir `trial_start_at = now()`,
      `trial_end_at = now() + 30 days`, `subscription_status = 'trial'`, `plan = 'pro'`
      → **le restaurant démarre en accès complet, pas en free**, pour habituer aux fonctionnalités
      comme vous le souhaitez.
- [ ] `notify pgrst, 'reload schema'` après les migrations.
## Phase 1 — Bascule automatique fin d'essai (le cœur du mécanisme)
 
- [ ] Cron Vercel quotidien (`/api/cron/check-trials`) :
  - Restaurants avec `subscription_status = 'trial'` et `trial_end_at <= now()`
    ET aucun paiement confirmé → bascule `subscription_status = 'suspended'`, `plan = 'free'`
  - Restaurants à J-3 de `trial_end_at` → déclenche génération + envoi automatique du lien
    de paiement CinetPay (voir Phase 2)
- [ ] `useSubscriptionGate.js` — hook lu au chargement du dashboard admin restaurant :
  - `trial` ou `active` → accès complet
  - `suspended` → dégrade l'UI vers les limites du plan free (pas de coupure brutale des
    commandes en cours)
- [ ] Définir précisément ce qui est bloqué en `suspended` (reprendre le tableau Free/Pro déjà
      établi : Realtime, stats, branding QR, mobile money client final, multi-comptes staff)
## Phase 1bis — Garde-fous & redondance manuelle (avant de brancher l'argent)
 
Objectif : "zéro intervention" ne veut pas dire "aucun filet de sécurité" — les 3 pannes
les plus probables avec un agrégateur Mobile Money doivent être absorbées automatiquement,
et la seule intervention manuelle qui reste doit être tracée, jamais silencieuse.
 
- [ ] Contrainte `UNIQUE` sur `subscription_payments.transaction_id` — idempotence stricte,
      un webhook dupliqué ne peut jamais faire avancer `next_billing_date` deux fois
- [ ] Cron horaire `/api/cron/reconcile-payments` — interroge l'API CinetPay (pas votre BD)
      pour tout `subscription_payments.status = 'pending'` vieux de +15 min, corrige lui-même
      si le paiement a réussi côté CinetPay mais que le webhook s'est perdu
- [ ] Le cron `check-trials` (Phase 1) vérifie toujours `subscription_payments` en dernier
      ressort avant de suspendre — jamais de bascule `suspended` uniquement sur `trial_end_at`
      (évite la course cron vs webhook arrivé à la dernière minute)
- [ ] Table `subscription_events` — log automatique de CHAQUE transition de statut avec
      `triggered_by` (`webhook` | `cron` | `manual`) et `reason` (obligatoire si manuel)
- [ ] Bouton d'override manuel dans `SuperAdminRoute` (forcer `active`/`suspended`), caché
      derrière confirmation + champ raison obligatoire — soupape de secours pour litige ou
      geste commercial, jamais l'usage courant
## Phase 2 — Paiement abonnement B2B (révisé, 08 août 2026)

**Décision actée** : CinetPay/Mobile Money n'est pas le bon outil pour ce paiement.
Segment premium = clients avec infrastructure bancaire déjà en place, faible volume
(quelques clients), paiement récurrent à montant fixe — le virement bancaire avec
confirmation manuelle est plus adapté que l'agrégateur, et débloque immédiatement
la monétisation sans attendre la levée du blocage RCCM.
CinetPay reste pertinent mais reclassé vers Phase 5bis (paiement du client final du
restaurant — volume élevé, petits montants, consommateur non-bancarisé — son vrai
cas d'usage).

- [ ] Écran (ou section `Settings.jsx` / `SuperAdminRoute`) affichant les
      coordonnées bancaires de réception au restaurant en fin de trial — RIB/IBAN,
      montant attendu, référence à indiquer (ex: nom du restaurant ou ID)
- [ ] Notification automatique à J-3 de `trial_end_at` (réutilise le cron
      `check-trials` déjà existant) : email/WhatsApp avec les instructions de
      virement, pas de lien de paiement à générer
- [ ] Bouton d'override manuel dans `SuperAdminRoute` (déjà scopé en Phase 1bis)
      devient l'outil principal de confirmation de paiement, pas un simple filet
      de secours : toi, après avoir vu le virement sur ton relevé, tu marques le
      restaurant `active` manuellement — passe `subscription_status`, avance
      `next_billing_date` d'un mois, log dans `subscription_events` avec
      `triggered_by = 'manual'` et `reason` obligatoire (ex: "virement reçu le JJ/MM")
- [ ] Pas de webhook, pas de réconciliation automatique nécessaire à ce stade —
      le volume (quelques clients/mois) rend la vérification manuelle largement
      suffisante, cohérent avec le principe "manuel d'abord"

**Prérequis à vérifier avant de coder** : confirmer avec ta banque si un compte
professionnel pour recevoir ces virements nécessite un RCCM, ou si un compte plus
simple suffit en attendant la régularisation de ta structure propre.

## Phase 2bis — CinetPay (reporté à Phase 5bis)

L'intégration CinetPay réelle n'est plus sur le chemin critique de l'abonnement
SaaS. Elle reste scopée pour le paiement du client final du restaurant
(voir Phase 5bis) — c'est son terrain naturel : volume élevé, petits montants,
Mobile Money adapté au consommateur final non-bancarisé. Le blocage RCCM
n'empêche donc plus de monétiser l'abonnement.
## Phase 3 — Domaine personnalisé (structures premium uniquement)
 
- [ ] `middleware.ts` (racine projet) — résout `host` header → `restaurant_id` via `custom_domain`
      ou `slug`, réécrit en interne vers `/r/[restaurantId]/...`
- [ ] Intégration Vercel Domains API — ajout programmatique du domaine au projet
- [ ] Activer `custom_domain` uniquement si `subscription_status = 'active'` (recoupe le gate
      de la Phase 1 — pas de logique séparée à maintenir)
- [ ] Instructions DNS simples à fournir au client (CNAME vers Vercel)
## Phase 4 — Dashboard Super-Admin (vue passive, pas d'action requise)
 
- [ ] Écran `SuperAdminRoute` : liste des restaurants avec `plan`, `subscription_status`,
      `next_billing_date`, `partner_id`
- [ ] Compteur global "restaurants payants actifs" — la seule chose que vous devez regarder
- [ ] Table d'audit `subscription_events` (log automatique de chaque transition de statut,
      pas de saisie manuelle) — utile pour tracer un litige sans dépendre de la mémoire
## Phase 5 — Segmentation partenaire / grands comptes
 
- [ ] Prix unique réseau partenaire : ~45 000 FCFA/mois (à valider sur 2-3 clients réels avant
      de figer), split 60/40 via `partner_id.commission_rate`
- [ ] Petit "poisson rouge" : le plan `free` reste ouvert en accès libre après suspension —
      pas de mur total, juste une version limitée (menu réduit, pas de Realtime/stats/branding)
      → laisse une porte d'entrée sans cannibaliser l'offre premium du réseau partenaire
## Phase 5bis — Paiement client final (validation de commande) — MANQUANT, à ajouter
 
Distinct de l'abonnement SaaS : c'est le client du restaurant qui paie sa commande via Mobile Money.
Repris de notre premier échange, jamais intégré à ce todo jusqu'ici.
 
- [ ] Table `payments` — `order_id`, `provider`, `transaction_id`, `status`, `amount`, `phone_number`, `paid_at`
- [ ] Écran `PaymentStep.jsx` inséré entre le choix du type de commande et la confirmation
      (Espèces par défaut toujours disponible, Mobile Money en option — jamais bloquant si
      l'API est indisponible)
- [ ] Route `/api/payment-webhook` — met à jour `payments.status`, déclenche le Realtime déjà
      utilisé par le dashboard admin
- [ ] Badge "Payé ✓ / En attente" sur chaque commande dans le dashboard admin
- [ ] Gate : cette feature n'est visible côté client que si `restaurants.subscription_status`
      = `trial` ou `active` (recoupe `useSubscriptionGate.js` de la Phase 1 — pas de logique séparée)
## Phase 5ter — Redondance offline (PWA, pas de serveur local)
 
Objectif : le restaurant continue à prendre des commandes même si sa connexion internet coupe.
Pas de serveur physique en local à maintenir à distance — un PWA offline-first suffit et reste
dans votre stack actuelle (Vite le supporte nativement via plugin).
 
- [ ] `vite-plugin-pwa` — service worker qui met en cache le menu (assets + données) pour
      consultation offline
- [ ] IndexedDB (via `idb` ou `dexie`) — file locale des commandes prises hors-ligne
- [ ] Background Sync API — dès que la connexion revient, la file locale se synchronise
      automatiquement vers Supabase (upsert par `id` généré côté client pour éviter les doublons)
- [ ] Indicateur visuel discret dans le dashboard admin ("Hors-ligne — X commandes en attente
      de synchro") pour que le staff sache où il en est
- [ ] Le paiement Mobile Money (Phase 5bis) ne peut pas fonctionner offline par nature (appel API
      externe) → en mode hors-ligne, seul "Espèces" reste sélectionnable, Mobile Money grisé
      automatiquement tant que le réseau n'est pas revenu
## Phase 6 — Test du flux vous-même
 
- [ ] Créer un restaurant de test → vérifier trial auto (30j), plan pro par défaut
- [ ] Forcer `trial_end_at` dans le passé → vérifier bascule cron vers `suspended` + dégradation UI
- [ ] Simuler paiement CinetPay sandbox → vérifier webhook → retour à `active` sans intervention
- [ ] Vérifier domaine personnalisé activé/désactivé selon le statut
---
 
**Ordre d'attaque suggéré (révisé)** : Phase 0 → Phase 1 → Phase 1bis (garde-fous) →
Phase 6 (tester la mécanique trial/suspension à vide) → **Phase 2 révisée (virement +
confirmation manuelle, débloque la monétisation immédiatement)** → Phase 3 → Phase 4 →
Phase 5 → Phase 5bis (paiement client final — c'est ici que CinetPay/Mobile Money
trouve sa vraie place) → Phase 5ter (offline).
