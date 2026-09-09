# Guide de Déploiement et Configuration des Webhooks — Vercel & Yabetoo

Ce guide explique comment configurer les variables d'environnement et les URL de webhooks sur Vercel et Yabetoo pour garantir le bon fonctionnement du paiement des abonnements et des commandes.

---

## 1. Variables d'Environnement Requises (Vercel)

Dans votre projet Vercel (**Settings -> Environment Variables**), configurez les clés suivantes pour tous les environnements (`Production`, `Preview`, `Development`) :

| Variable | Exemple / Valeur | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL de votre projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | **Clé Service Role** (bypass RLS pour les webhooks serveur) |
| `YABETOO_SECRET_KEY` | `sec_live_xxxx` | Clé secrète API Yabetoo |
| `YABETOO_ACCOUNT_ID` | `acc_xxxx` | Identifiant de compte marchand Yabetoo |
| `YABETOO_WEBHOOK_SECRET` | `whsec_xxxx` | Clé secrète de signature HMAC des webhooks Yabetoo |
| `YABETOO_TEST_MODE` | `true` ou `false` | `true` pour activer les montants de test (500 XAF) |
| `CRON_SECRET` | `un_token_tres_securise` | Token d'autorisation pour sécuriser l'appel du cron de réconciliation |

> [!IMPORTANT]
> Assurez-vous que la variable `YABETOO_TEST_MODE` a la **même valeur** sur les endpoints d'initialisation (`create-checkout-session`) et sur les endpoints de webhook.

---

## 2. Configuration des URL de Webhooks dans le Dashboard Yabetoo

Dans votre espace d'administration marchand Yabetoo (**Développeurs / Webhooks**) :

1. **Webhook Abonnement SaaS (Propriétaires)** :
   - **URL de destination** : `https://<votre-domaine-vercel>.vercel.app/api/webhooks/yabetoo-subscription`
   - *(Note : L'URL legacy `https://<votre-domaine-vercel>.vercel.app/api/webhooks/yabetoo-debug` est également prise en charge)*
   - **Événements à écouter** : `intent.succeeded`

2. **Webhook Commandes Client Final (Emporter)** :
   - **URL de destination** : `https://<votre-domaine-vercel>.vercel.app/api/webhooks/yabetoo-order`
   - **Événements à écouter** : `intent.succeeded`

3. **Copie du secret Webhook** :
   - Copiez le secret fourni par Yabetoo lors de la création du webhook et collez-le dans la variable Vercel `YABETOO_WEBHOOK_SECRET`.

---

## 3. Configuration du Cron de Réconciliation sur Vercel / GitHub Actions

Le fichier `vercel.json` est configuré avec un job cron quotidien :

```json
{
  "crons": [{
    "path": "/api/cron/check-trials",
    "schedule": "0 10 * * *"
  }]
}
```

Pour déclencher la réconciliation horaire des paiements suspendus ou manqués via `api/cron/reconcile-payments.js` :
- Configurez un workflow **GitHub Actions** ou un service externe (ex: cron-job.org) effectuant une requête `POST` ou `GET` vers :
  `https://<votre-domaine-vercel>.vercel.app/api/cron/reconcile-payments`
- Header HTTP requis : `Authorization: Bearer <VALEUR_DE_CRON_SECRET>`

---

## 4. Test et Vérification

1. Effectuer une souscription de test depuis `/settings`.
2. Vérifier dans les logs Vercel Serverless (`api/webhooks/yabetoo-subscription`) la présence du log :
   `[YABETOO SUBSCRIPTION] ✅ PAIEMENT TRAITÉ AVEC SUCCÈS`
3. Vérifier dans Supabase que le restaurant a basculé au statut `active` dans la table `restaurants` et qu'une ligne a été ajoutée dans `subscription_events`.
