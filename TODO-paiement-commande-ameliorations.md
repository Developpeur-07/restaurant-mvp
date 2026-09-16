# Todo — Améliorations paiement commande (productId dédié & consolidation session)

Distinct des todos abonnement SaaS et flux de commande en salle. Concerne deux
améliorations identifiées après la résolution des bugs critiques (FK, Realtime,
routage) de septembre 2026. Aucune des deux n'est bloquante pour le fonctionnement
actuel — le paiement commande fonctionne déjà en production avec les compromis
temporaires décrits ci-dessous.

---

## Chantier 1 — productId Yabetoo dédié aux commandes clients

### Contexte

`api/create-order-payment-session.js` utilise actuellement `productId: "prod_abonnement_pro"`
— le même identifiant que l'abonnement SaaS B2B (`api/create-checkout-session.js`).
Ce n'est pas un problème de sécurité ni de fonctionnement (confirmé par test réel :
session créée avec succès), mais un mélange comptable côté Yabetoo : leurs propres
statistiques/dashboard marchand ne pourront pas distinguer les revenus d'abonnement
des revenus de commandes clients tant que ça reste ainsi.

Rappel du diagnostic qui a mené à cette situation : `productId: "order_emporter"`
(identifiant initial, jamais enregistré côté Yabetoo) provoquait un `500 Internal
Server Error` générique. Le remplacement par `prod_abonnement_pro` était un test de
confirmation d'hypothèse, devenu une solution de contournement temporaire faute de
mieux.

### Ce qui NE doit PAS être fait

- Ne pas créer un `productId` différent par restaurant — ne scale pas, et la
  granularité comptable par restaurant vit déjà dans votre table `payments`
  (`restaurant_id`, `amount`, `paid_at`), pas dans le système Yabetoo.
- Ne pas continuer indéfiniment avec `prod_abonnement_pro` pour les commandes —
  dette technique qui grossit avec le volume.

### Actions

- [ ] Envoyer un message factuel au support Yabetoo (`support@yabetoopay.com`),
      avec les faits déjà établis, pas une question ouverte :
      - `productId: "order_emporter"` (ou nom de votre choix) déclenche un
        `500 Internal Server Error` sur `POST /v1/sessions`
      - `productId: "prod_abonnement_pro"` fonctionne normalement sur le même
        endpoint, avec la même structure de payload
      - Demande explicite : enregistrer ce nouveau `productId` sur le compte
        marchand, comme cela a dû être fait pour `prod_abonnement_pro`
      - Joindre l'horodatage exact du test ayant produit le 500 (09 septembre
        2026, ~12:25 GMT) pour qu'ils retrouvent la requête dans leurs logs
- [ ] Poser la question de fond en parallèle : `productId` est-il un champ à
      enregistrement obligatoire côté leur dashboard, ou existe-t-il un mode où
      ce champ est libre ? (Confirme ou infirme définitivement l'hypothèse,
      actuellement forte mais pas prouvée à 100% par leur documentation.)
- [ ] Une fois le nouveau `productId` confirmé actif par leur support :
      remplacer `"prod_abonnement_pro"` par le nouveau `productId` dans
      `api/create-order-payment-session.js` — un seul changement de valeur,
      pas de logique à toucher.
- [ ] Retester un paiement réel après changement, pour confirmer que le nouveau
      `productId` fonctionne aussi bien que l'ancien contournement.

### Pré-requis avant de coder quoi que ce soit ici

Rien — ce chantier dépend uniquement d'une réponse externe (support Yabetoo).
Le code actuel (`prod_abonnement_pro`) continue de fonctionner sans risque
en attendant.

---

## Chantier 2 — Consolidation du paiement multi-commandes de session

### Contexte

Décision déjà actée (session de septembre 2026) : quand une table a plusieurs
commandes actives dans la même session (`order_sessions`), le paiement en ligne
doit couvrir le **total de la session** (`sessionTotal`, déjà calculé côté
`Tracking.jsx`), pas une commande individuelle. Raisons déjà posées :

- Cohérence avec le reçu de commande (généré à la clôture de session, pas par
  commande individuelle — `TODO-flux-commande.md`, Phase F)
- Éviter les redirections Yabetoo répétées pour chaque commande d'une même table
  (mauvaise UX mobile, surtout sur connexion lente)
- Éviter une double voie de paiement en parallèle de l'encaissement manuel prévu
  côté réception ("Clôturer & encaisser")

### Ce qui existe déjà et peut être réutilisé tel quel

- `sessionTotal` : déjà calculé dans `Tracking.jsx` (somme de `order` +
  `siblingOrders`, hors commandes `cancelled`)
- `hasSession` : déjà calculé, détecte la présence de commandes sœurs
- Structure de `order_sessions` (id, table_id, restaurant_id, status) — déjà en
  place depuis `TODO-flux-commande.md` Phase A

### Ce qui doit changer

#### Schéma — `payments`

- [x] **Pre-flight avant migration** — vérifié.
- [x] Migration `019_add_session_id_to_payments.sql` créée (colonne `session_id uuid NULL` + index `idx_payments_session_id`).
- [x] Décision : `order_id` conservé comme commande parente déclencheuse, `session_id` ajouté en parallèle.

#### Backend — `api/create-order-payment-session.js`

- [x] Accepter optionnellement `sessionId` en plus de `orderId` dans le body.
- [x] Si `sessionId` fourni : recalcul du montant côté serveur comme la somme de toutes les commandes actives de la session.
- [x] `metadata` envoyée à Yabetoo : ajout de `session_id` en plus de `order_id`.

#### Backend — `api/webhooks/yabetoo-order.js`

- [x] Si `metadata.session_id` présent : recherche et confirmation du paiement `pending` par `session_id`.
- [x] Validation `payments.status = 'succeeded'`.

#### Frontend — `Tracking.jsx`

- [x] Adaptation de `handleOnlinePayment()` pour envoyer `sessionId` si `session_id` présent.
- [x] Adaptation du bouton de paiement : affichage de `sessionTotal` au lieu de `total` lorsqu'une session existe.
- [x] Adaptation du canal Realtime `payments` sur `session_id` pour propager le badge "Payé ✓" en direct sur toutes les commandes de la session.

### Ordre d'attaque suggéré

1. Migration `session_id` sur `payments` (pre-flight d'abord, comme toujours)
2. Backend `create-order-payment-session.js` — support du mode session
3. Backend `yabetoo-order.js` — recherche et confirmation par session
4. Frontend `Tracking.jsx` — déclenchement + affichage du badge multi-commandes
5. Test réel avec au moins 2 commandes actives sur une même table/session

### Dépendances

Aucune dépendance sur le chantier 1 (productId) — les deux peuvent être menés en
parallèle ou dans l'ordre de votre choix, ils ne se recoupent pas techniquement.
