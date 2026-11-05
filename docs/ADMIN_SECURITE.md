# Sécurité de l'espace administrateur

Mis en place le 05 novembre 2026. Trois chantiers : **accès**, **double
authentification**, **mots de passe de l'équipe**.

---

## 1. Ce qui était en place avant (et la faille)

`AdminRoute` empilait `ProtectedRoute` + `SubscriptionProvider`.
`ProtectedRoute` vérifie uniquement *« y a-t-il une session ? »*.

Conséquence : un compte **cuisine** pouvait ouvrir `/dashboard` en tapant
l'URL et consulter les statistiques et le chiffre d'affaires. Aucune notion de
rôle n'était vérifiée côté client, et aucune 2FA n'existait.

---

## 2. Ce qui est en place maintenant

### 2.1 Filtrage par rôle — `src/components/RoleGuard.jsx`

| Compte | `/dashboard` `/settings` `/menu-manager` `/history` `/qrcode` | `/kitchen` |
|---|---|---|
| Propriétaire (`restaurants.owner_id`) | ✅ | ✅ |
| Réception (`restaurant_staff.role = reception`) | ✅ | ✅ |
| Cuisine (`restaurant_staff.role = kitchen`) | ❌ redirigé vers `/kitchen` | ✅ |

### 2.2 Double authentification — `src/components/MfaGate.jsx`

Technologie : **TOTP** (RFC 6238), l'algorithme de Google Authenticator, Authy
et Microsoft Authenticator. Pas de SMS, pas de WhatsApp.

> **Pourquoi pas WhatsApp ?** WhatsApp Business / Cloud API est un service
> payant de Meta, avec un numéro vérifié, un compte développeur et des
> templates de messages à faire valider. Le SMS passe par Twilio (payant
> également, et peu fiable en Afrique centrale). Le TOTP, lui, est **gratuit,
> instantané, et fonctionne hors ligne** — ce qui compte pour une connexion
> depuis un restaurant. On pourra ajouter un canal WhatsApp plus tard, en
> complément, si le besoin apparaît.

**Règle appliquée :** si le compte possède un facteur TOTP *vérifié*, alors
toute ouverture d'une page admin exige une session `aal2`. Tant qu'aucun
facteur n'est activé, rien ne change — impossible de se retrouver enfermé dehors
par erreur.

Niveaux Supabase :

- `aal1` = mot de passe seul
- `aal2` = mot de passe **+** code TOTP validé

**Codes de secours :** 10 codes à usage unique, générés une seule fois à
l'activation. Stockés **hashés (scrypt, sel aléatoire)** dans
`admin_recovery_codes`, table qu'aucun client ne peut lire. Si le téléphone est
perdu, un code consomme la vérification et supprime les facteurs TOTP : on
récupère l'accès, puis on réactive la 2FA.

### 2.3 Réinitialisation des mots de passe équipe — `api/admin/staff.js`

Impossible depuis le navigateur : `auth.admin.updateUserById()` exige la clé
`service_role`, qui ne doit jamais être exposée côté client. C'est donc une
fonction serverless Vercel.

Chaîne de contrôle :

1. JWT Supabase vérifié **côté serveur** (`auth.getUser(token)`), pas simplement décodé
2. Si l'appelant a activé la 2FA, le jeton doit porter le claim `aal: aal2`
3. L'appelant doit être propriétaire du restaurant (ou `super_admin`)
4. Le membre visé doit appartenir à ce restaurant
5. Mot de passe : 8 caractères minimum, refusé s'il est trop courant
6. Action journalisée dans `admin_audit_log`, plafonnée à 20 par heure

---

## 3. Mise en route (à faire une seule fois)

### Étape 1 — Base de données

Exécuter `docs/021_admin_security.sql` dans le **SQL Editor** du dashboard
Supabase. Crée `admin_recovery_codes` et `admin_audit_log`.

### Étape 2 — Variable d'environnement Vercel

`SUPABASE_SERVICE_ROLE_KEY` doit être disponible sur les environnements
**Production**, **Preview** et **Development** (elle ne l'était qu'en
Production). Sans elle sur Preview, les tests avant mise en prod renvoient
« Configuration Supabase serveur manquante ».

Dashboard Vercel → *restaurant-mvp* → Settings → Environment Variables →
`SUPABASE_SERVICE_ROLE_KEY` → cocher les 3 environnements → Save.

### Étape 3 — Activer la 2FA sur ton compte

1. Se connecter, ouvrir **Paramètres**
2. Section *Double authentification* → **Activer**
3. Scanner le QR code avec Google Authenticator
4. Saisir le code à 6 chiffres
5. **Copier et mettre de côté les 10 codes de secours** (ils ne seront plus
   jamais réaffichés)

À partir de là, chaque nouvelle connexion à l'espace admin demandera le code.

### Étape 4 — (optionnel, recommandé plus tard) Durcir la base

Le bloc 3 de `docs/021_admin_security.sql`, commenté, ajoute des policies RLS
qui exigent `aal2` au niveau Postgres. Deuxième barrière : même en contournant
le front, la base refuse. **Ne l'activer qu'après avoir vérifié l'étape 3.**

---

## 4. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/components/RoleGuard.jsx` | Filtre par rôle (cuisine exclue de l'admin) |
| `src/components/MfaGate.jsx` | Défi TOTP + code de secours avant toute page admin |
| `src/components/AdminRoute.jsx` | Empilement : session → rôle → 2FA → abonnement |
| `src/components/SuperAdminRoute.jsx` | Ajout du défi 2FA |
| `src/pages/Settings.jsx` | Sections *Double authentification* et *Mots de passe de l'équipe* |
| `src/lib/api.js` | Client des endpoints serveur (jeton obligatoire) |
| `api/_lib/admin-auth.js` | Vérification JWT, 2FA, propriété, anti-abus, audit |
| `api/admin/staff.js` | Liste de l'équipe + réinitialisation de mot de passe |
| `api/admin/security/recovery-codes.js` | Génération / consommation des codes de secours |
| `docs/021_admin_security.sql` | Schéma + RLS + durcissement optionnel |

---

## 5. Limites connues (assumées)

- **Pas de « se souvenir de cet appareil ».** Supabase n'a pas cette notion :
  le code est redemandé à chaque nouvelle session. C'est plus sûr, un peu plus
  contraignant au quotidien.
- **Le durcissement RLS n'est pas activé par défaut** — délibérément, pour ne
  pas risquer un verrouillage avant le test terrain.
- **Pas de canal WhatsApp/SMS** (voir §2.2).
- **Pas de verrouillage de compte après N échecs de mot de passe.** Supabase
  applique son propre rate limiting ; un plafonnement maison arrivera dans une
  prochaine passe si besoin.
