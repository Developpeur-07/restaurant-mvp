# Inventaire des Bugs Identifiés et Corrections Apportées — restaurant-mvp

Ce document détaille l'ensemble des dysfonctionnements identifiés lors de l'analyse du projet **restaurant-mvp**, la cause technique racine de chaque problème, et les solutions apportées.

---

## 1. BUG CRITIQUE PRINCIPAL : Le statut du restaurant ne se mettait pas à jour après le paiement

### Symptôme
Une fois le paiement d'abonnement effectué avec succès sur le guichet Yabetoo, le restaurant restait au statut `trial` ou `suspended` en base de données et sur l'interface utilisateur.

### Causes Racines Isolées

1. **Désynchronisation de `YABETOO_TEST_MODE` et du montant (`PRO_PRICE`)** :
   - `create-checkout-session.js` définit le montant à `500 XAF` en mode test ou `35 000 XAF` en production.
   - `yabetoo-debug.js` vérifiait strictement `if (amount !== PRO_PRICE)` et filtrait Supabase par `.eq("amount", PRO_PRICE)`.
   - Lorsque le paiement était testé à 500 XAF alors que la variable d'environnement `YABETOO_TEST_MODE="true"` manquait dans l'environnement Vercel du webhook, le webhook attendait 35 000 XAF et rejetait l'événement avec un code HTTP 400.
   - **Correction** : Le montant du paiement à rechercher est désormais extrait dynamiquement de la ligne `pending` enregistrée en base ou accepté avec tolérance selon le montant réellement payé.

2. **Absence du `checkout_session_id` dans les métadonnées Yabetoo** :
   - Lors de la création de la session Yabetoo (`POST /v1/sessions`), le paramètre `metadata` transmis ne contenait pas l'ID de session (car celui-ci est généré par Yabetoo en réponse).
   - Dans le webhook, la recherche du paiement en attente filtrait optionnellement sur `metadata.checkout_session_id`. Comme ce champ était toujours `null`, la recherche filtrait de manière imprécise ou échouait si plusieurs transactions existaient.
   - **Correction** : La recherche du paiement dans `yabetoo-subscription.js` s'effectue désormais en deux étapes :
     1. Par `transaction_id` correspondant à l'ID de session Yabetoo si présent.
     2. En fallback sur le dernier paiement `pending` appartenant au `restaurant_id` spécifié dans les métadonnées.

3. **Incohérence du nom d'endpoint et absence du Webhook de Commande** :
   - Seul le fichier `api/webhooks/yabetoo-debug.js` existait.
   - Le fichier `api/webhooks/yabetoo-order-payment.js` (mentionné dans `yabetooWebhook.js` pour les paiements de commandes `emporter`) **n'existait pas**.
   - **Correction** : 
     - Création du webhook officiel d'abonnement : `api/webhooks/yabetoo-subscription.js`.
     - Création du webhook officiel de commande : `api/webhooks/yabetoo-order.js`.
     - Maintien de `api/webhooks/yabetoo-debug.js` comme proxy/alias redirigeant vers `yabetoo-subscription.js` pour garantir la rétrocompatibilité si le dashboard Yabetoo est configuré sur l'ancienne URL.

4. **Absence de rafraîchissement temps réel et d'indicateur frontend** :
   - Lorsque le navigateur revenait sur la page `/settings?payment=success`, `Settings.jsx` ne réagissait pas au paramètre d'URL `payment=success` et `SubscriptionProvider` ne rafraîchissait pas son état local.
   - **Correction** :
     - Ajout d'un abonnement **Supabase Realtime** sur la table `restaurants` dans `SubscriptionProvider.jsx`. Dès que le webhook modifie le statut en base, le composant met à jour l'interface sans rechargement de page.
     - Ajout de la gestion des query params `?payment=success` et `?payment=cancelled` dans `Settings.jsx` avec affichage d'un message d'information à l'utilisateur et nettoyage automatique de l'URL.

---

## 2. AUTRES BUGS ET AMÉLIORATIONS DU CODEBASE

### A. Gestion du Role-Based Access Control (RBAC) & Identifiant Propriétaire
- **Problème** : Dans `Settings.jsx`, l'enregistrement de l'identité de marque filtrait sur `.eq("owner_id", user.id)`. Si une action était tentée par un rôle réception ou staff autorisé, la requête échouait sans retour clair.
- **Amélioration** : Utilisation systématique de `restaurantId` provenant du contexte `SubscriptionProvider` pour sécuriser les requêtes sur les restaurants.

### B. Incohérence entre Paiement Manuel Mobile Money et Automatisation Yabetoo
- **Problème** : Le composant `Dashboard.jsx` affichait des consignes de transfert Mobile Money vers des numéros personnels (`PAYMENT_INFO`), tandis que `Settings.jsx` redirigeait vers Yabetoo.
- **Amélioration** : Clarification de l'architecture : Yabetoo gère désormais le flux automatisé principal avec détection instantanée via Webhook + Realtime, et la procédure manuelle reste disponible comme solution de secours.

### C. Gestion des Exceptions et Logs Serveur
- **Problème** : Plusieurs fonctions serverless ne traitaient pas les erreurs de parsing JSON ou les échecs réseau Supabase de manière explicite.
- **Amélioration** : Ajout de blocs `try...catch` étanches, avec des réponses HTTP appropriées (`400`, `401`, `403`, `404`, `500`, `502`) et des journaux de logs structurés (`[YABETOO SUBSCRIPTION]`, `[YABETOO ORDER]`).
