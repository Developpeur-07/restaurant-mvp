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