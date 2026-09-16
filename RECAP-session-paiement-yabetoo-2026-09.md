# Récap — Chantier paiement Yabetoo (commandes + abonnement) & Super Admin
Session du 09-13 septembre 2026

---

## 0. Rappel de la vision long terme (pour resituer chaque décision)

- SaaS multi-tenant, un seul projet Supabase / une seule app Vercel, `restaurant_id` comme pivot partout, RLS pour l'isolation.
- Cible commerciale : **requins et baleines** (restaurants premium), pas les petits poissons de quartier — chaque décision d'architecture (paiement centralisé, confidentialité, tarification) doit rester cohérente avec ce positionnement.
- Paiement Mobile Money via Yabetoo, collecte centralisée sur votre compte, avec reversement automatique quotidien aux restaurants (architecture actée, pas encore codée dans le détail settlement).
- Split revenu partenaire 60/40, palier de prix réseau partenaire encore à valider sur clients réels.
- Évolution prévue vers une app Android via Capacitor, sans dupliquer la logique métier (le backend Supabase reste le centre de gravité, quelle que soit l'interface).
- Deux chantiers parallèles et distincts : **abonnement SaaS** (vous ↔ propriétaire restaurant) et **flux de commande en salle / paiement client final** (client ↔ restaurant, vous n'êtes qu'un intermédiaire technique).

---

## 1. Ce qui a été fait cette session

### 1.1 Diagnostic déploiement Vercel
- Confirmé que `main` pointait bien vers le bon commit (`59dddea`) et le bon déploiement de production — la confusion initiale venait de la comparaison entre l'URL de déploiement unique (`restaurant-kcrmjcluw-...`) et l'alias de branche (`restaurant-mvp-git-main-...`), pas d'un vrai problème de configuration Git → Vercel.
- **Non résolu** : une redirection vers un ancien restaurant de démo (`a1b2c3d4-0000-0000-0000-000000000001`) apparaissait sur le domaine nu, confirmée reproductible même en navigation privée → donc codée en dur quelque part (routeur ou `vercel.json`), jamais localisée précisément faute d'avoir reçu `App.jsx` complet.

### 1.2 Bug 502 sur `create-order-payment-session` (paiement commande client)
- Cause identifiée avec certitude : `productId: "order_emporter"` n'était pas enregistré côté compte marchand Yabetoo → 500 générique de leur API.
- Test de confirmation : remplacement temporaire par `productId: "prod_abonnement_pro"` (celui qui fonctionne déjà pour l'abonnement) → session créée avec succès, échec ensuite sur `LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED` (solde insuffisant du compte de test) → **confirme que le circuit technique fonctionne**, le problème était bien isolé au `productId`.
- Décision prise : ne pas créer de `productId` séparé par restaurant côté Yabetoo (ne scalerait pas) ; la vraie granularité comptable par restaurant vit dans votre propre table `payments` (`restaurant_id`, `amount`, `paid_at`), pas dans leur système. Reste à faire : contacter `support@yabetoopay.com` pour faire enregistrer un `productId` dédié aux commandes clients (ex. `commande_client`), au lieu de continuer à emprunter celui de l'abonnement.

### 1.3 Découverte majeure — webhook commande contournait la RPC et utilisait un statut illégal
- `api/webhooks/yabetoo-order.js` faisait un `.update({ status: "paid" })` **direct** sur `orders`, en contournant `transition_order_status` (votre source unique de vérité pour les transitions de statut).
- Vérification de la contrainte `orders_status_check` : **`'paid'` n'est pas une valeur légale** pour `orders.status` — cette valeur n'existe que dans `orders_archive`, produite uniquement par la branche `paid` de `transition_order_status` (qui archive et supprime la ligne de `orders`, jamais un simple `UPDATE`).
- Vérification du code de création de commande (`Menu.jsx`) : confirmé que **toute commande** (`sur_place` ou `emporter`) est créée directement avec `status: 'received'`, jamais `'pending_payment'`. Le paiement en ligne est donc bien pensé comme **non bloquant** dès la création (cohérent avec la philosophie déjà actée : espèces toujours disponibles, Mobile Money en option).
- **Conclusion et correctif appliqué** : le webhook n'a rien à transitionner sur `orders.status`. L'étape de mise à jour de `orders` a été **supprimée entièrement** du webhook — il se contente désormais de confirmer `payments.status = 'succeeded'`. Ce bug n'avait jamais été révélé en prod parce que le seul vrai test avait échoué *avant* d'atteindre cette étape (solde insuffisant).

### 1.4 Fonctionnalité Super Admin — Ventes du jour par restaurant
- Confirmé via pre-flight SQL : `payments` a la bonne structure, RLS activé avec zéro policy (= deny-all par défaut, pas un trou de sécurité), fonction `super_admin_override_subscription` existante à réutiliser comme pattern de garde-fou JWT.
- Migration `017` écrite et exécutée : RPC `get_daily_sales_by_restaurant(p_restaurant_id, p_date)`, `SECURITY DEFINER`, vérifiant `app_metadata.role = 'super_admin'` en interne, scope **volontairement limité aux paiements Mobile Money** (la table `payments`) — les ventes en espèces ne sont pas trackées à ce jour et ne remontent pas dans ce chiffre.
- `SuperAdmin.jsx` mis à jour : bouton "Ventes du jour" par restaurant, résultat affiché uniquement à la demande (pas de chiffre visible par défaut) — cohérent avec la préoccupation de confidentialité discutée (cf. 1.6).

### 1.5 Synchronisation front — vérifiée des deux côtés
- **Abonnement** : `SubscriptionProvider.jsx` a déjà un canal Realtime sur `restaurants` (`event: UPDATE`) + `Settings.jsx` gère `?payment=success` et appelle `refreshSubscription()`. **Rien à corriger ici**, déjà solide.
- **Commande** : `Tracking.jsx` mis à jour pour ajouter un second canal Realtime dédié à `payments` (indépendant du canal `orders` existant), un state `payment` séparé, et un badge "Payé en ligne via Mobile Money" affiché indépendamment du statut de préparation de la commande — nécessaire puisque `orders.status` ne devient jamais `'paid'` pour l'emporter (cf. 1.3).

### 1.6 Discussion confidentialité chiffre d'affaires
- Point reconnu comme structurellement inévitable avec la collecte centralisée (comme Stripe Connect, Uber Eats, etc.) — pas un défaut de conception propre à votre architecture.
- Ligne de conduite retenue : discipline personnelle de consultation (jamais sans raison opérationnelle), transparence commerciale sur le fonctionnement du règlement centralisé, et l'option déjà actée "compte Yabetoo propre au restaurant" comme fonctionnalité premium payante pour les clients qui l'exigeraient — à garder comme argument de vente pour les gros comptes, rien à coder dans l'immédiat.

### 1.7 Ajustements montant de test
- Passage de 500 XAF à **50 XAF** comme montant forcé en `YABETOO_TEST_MODE=true`, appliqué de façon cohérente dans **les deux** endpoints (`create-checkout-session.js` et `create-order-payment-session.js`) — pour rester loin de tout risque de blocage sur le solde de test.

---

## 2. Bugs découverts aujourd'hui — non résolus, à traiter

### 🔴 2.1 CRITIQUE — Contrainte FK bloque l'archivage des commandes payées en ligne
**Symptôme observé** : `update or delete on table "orders" violates foreign key constraint "payments_order_id_fkey"`.

**Cause** : `payments.order_id` a une FK stricte vers `orders(id)` sans `ON DELETE`. Dès qu'une commande a une ligne `payments` associée, `transition_order_status` ne peut plus l'archiver (`INSERT orders_archive` + `DELETE orders`) — Postgres refuse le `DELETE`.

**Impact** : toute commande payée en ligne devient impossible à faire passer par le cycle normal `served → paid`. Bloquant dès qu'un restaurant utilise le paiement en ligne en dine-in (et déjà bloquant pour la clôture de n'importe quelle commande testée avec un paiement associé).

**Décision à prendre** (options présentées, pas encore tranchées par vous) :
- **Option A** — colonne `payments.order_archive_id` en plus, mise à jour par la RPC au moment de l'archivage.
- **Option B** (recommandée) — retirer la contrainte FK stricte sur `payments.order_id`, la garder comme référence "molle" validée applicativement (déjà le cas dans le code qui vérifie l'existence de la commande avant insert).
- **Option C** — `order_id` nullable + `ON DELETE SET NULL` (migration de colonne supplémentaire).

**Prochaine étape** : vous prononcer sur l'option, puis pre-flight SQL + migration.

### 🔴 2.2 CRITIQUE — Realtime WebSocket cassé entièrement
**Symptôme observé** : `WebSocket connection ... failed: HTTP Authentication failed; no valid credentials available`, en boucle, dès la poignée de main (pas au niveau d'un canal spécifique).

**Impact potentiel** : si confirmé global, ça casserait **toute** la synchronisation en direct déjà en place et considérée comme acquise — pas seulement le nouveau canal `payments`, mais aussi le canal `orders` de `Tracking.jsx`, le canal `restaurants` de `SubscriptionProvider.jsx`, et tout futur Realtime (dashboard cuisine, réception).

**Pistes à vérifier, dans l'ordre** :
1. La clé anon utilisée par le frontend déployé (variable d'env Vercel) correspond-elle à la clé anon actuelle du projet Supabase (Project Settings → API) ? Une clé régénérée et non resynchronisée expliquerait un rejet systématique dès le transport.
2. Realtime est-il activé sur les tables concernées (Database → Replication → publication `supabase_realtime`) ? `payments` vient d'être ajoutée à l'écoute et n'a peut-être jamais été cochée.

**Prochaine étape** : vérifier le point 1 en priorité (rejet au niveau transport = probablement pas un souci de réplication par table).

### 🟠 2.3 Redirection cassée après paiement + "Restaurant introuvable"
**Symptôme observé** : après paiement réussi, redirection vers `/tracking/:orderId?payment=success&paymentId=...` sur le domaine `-git-main-`, qui affiche **"Restaurant introuvable"** — un message qui appartient à `Menu.jsx`, pas à `Tracking.jsx` (qui affiche "Commande introuvable."). Ça indique un problème de **routage**, pas un problème de données manquantes.

**Lien probable avec le point 1.1** (redirection jamais élucidée vers l'ancien ID `a1b2c3d4-...`) — même famille de bug, potentiellement une route catch-all ou une redirection mal configurée dans `App.jsx` ou `vercel.json`.

**Correctif immédiat proposé, pas encore appliqué** : uniformiser `APP_URL` dans les deux endpoints de paiement vers le domaine principal (`restaurant-mvp-jesus-net-s-projects.vercel.app`) plutôt que `-git-main-`, en attendant la vraie cause.

**Prochaine étape** : besoin du contenu complet de `src/App.jsx` (toutes les routes, notamment toute route `*`/catch-all) pour trancher définitivement — toujours pas reçu à ce stade.

### 🟡 2.4 Dette technique — `productId` partagé entre abonnement et commandes
Fonctionne pour l'instant (`prod_abonnement_pro` réutilisé), mais mélangerait les statistiques natives Yabetoo entre les deux types de vente si vous consultez un jour leur dashboard. À corriger en contactant leur support pour un `productId` dédié aux commandes — non bloquant, mais à ne pas oublier avant une vraie montée en charge.

### 🟡 2.5 Non élucidé — écart de montant en test (4000 au lieu de 500)
Lors du premier test avec solde insuffisant, le montant réel de la commande (4000 XAF) a été envoyé au lieu du montant forcé (500 XAF à l'époque). Hypothèse posée mais jamais confirmée : `YABETOO_TEST_MODE` mal scopé entre les environnements Vercel (Production vs Preview). À vérifier dans Vercel → Settings → Environment Variables si l'anomalie se reproduit avec le nouveau montant à 50 XAF.

---

## 3. À faire / à améliorer — feuille de route mise à jour

### Court terme (bloquant pour un flux de paiement commande fiable)
1. Trancher et corriger la contrainte FK `payments_order_id_fkey` (2.1)
2. Diagnostiquer et réparer Realtime (2.2) — priorité haute, casse potentiellement plus que le paiement
3. Élucider le routage `App.jsx` et la redirection cassée (2.3), qui recoupe le mystère non résolu du tout début de session (`a1b2c3d4-...`)
4. Contacter le support Yabetoo pour un `productId` dédié aux commandes (2.4)
5. Retester le flux complet une fois 1-2 réglés : commande → paiement 50 XAF → badge "Payé ✓" en direct sans refresh

### Moyen terme (déjà actés dans les TODO existants, toujours valables)
- Paiement consolidé par session multi-commandes (`sessionTotal`) plutôt qu'un paiement par commande individuelle — décision déjà prise dans cette session, pas encore codée. Nécessite d'ajouter `session_id` à `payments` pour le rapprochement, et d'adapter le webhook pour marquer toutes les commandes sœurs comme payées dans une même transaction.
- Reprise du reste de `TODO-abonnement-saas.md` (Phase 2 CinetPay en pause / remplacée par Yabetoo dans les faits, Phase 3 domaine personnalisé, Phase 4 dashboard Super Admin déjà bien avancé, Phase 5 segmentation partenaire).
- Reprise de `TODO-flux-commande.md` (Phases B à G, dashboard cuisine/réception, notifications WhatsApp, reçus).

### Long terme (vision produit)
- Fonctionnalité premium "compte Yabetoo propre" pour restaurants exigeants sur la confidentialité de leur chiffre d'affaires.
- Passage à Capacitor / Android, sans dupliquer la logique métier déjà côté Supabase.
- Reversement automatique quotidien aux restaurants (`restaurant_settlements`, `settlement_events`) — architecture actée, migration SQL déjà écrite (`015_paiement_client_reglement.sql`), logique de calcul/déclenchement encore à construire.

---

## 4. Erreurs à éviter — leçons de cette session, pour la suite

- **Ne jamais halluciner un statut ou une contrainte** : la découverte du bug `'paid'` illégal sur `orders` n'est venue que d'un pre-flight SQL systématique (`pg_get_constraintdef`) — sans ça, le webhook aurait planté silencieusement en prod dès le premier vrai paiement réussi.
- **Un test qui échoue pour la mauvaise raison masque le vrai bug** : le test à 500 XAF a échoué sur solde insuffisant, jamais sur la logique de mise à jour du statut — ce qui a permis au bug FK et au bug `'paid'` illégal de rester invisibles jusqu'à un vrai paiement réussi. Toujours se demander *pourquoi* un test a échoué avant de conclure qu'une autre partie du système est validée.
- **Toujours vérifier qu'une RPC "source unique de vérité" est bien utilisée partout** — un webhook écrit rapidement peut facilement la contourner avec un `.update()` direct, en apparence inoffensif.
- **SQL pre-flight avant toute migration, sans exception** — a permis d'éviter d'écraser une fonction déjà exécutée par erreur, deux fois cette session (`get_daily_sales_by_restaurant` déjà en place à l'identique).
- **Vérifier le scope des variables d'environnement Vercel (Production vs Preview)** avant de conclure à un bug de code quand un comportement semble incohérent (piste encore ouverte pour 2.5).
- **Un commit = un sujet**, dans la mesure du raisonnable — a permis de garder une trace claire de chaque correctif distinct plutôt qu'un gros commit fourre-tout difficile à auditer a posteriori.
- **Ne jamais assumer qu'un domaine `.vercel.app` alternatif est équivalent** à l'alias de branche officiel tant que le routage réel n'a pas été vérifié — la redirection cassée (2.3) le confirme concrètement.
