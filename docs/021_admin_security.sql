-- ============================================================================
-- 021_admin_security.sql
--
-- Sécurité de l'espace administrateur :
--   1. Codes de secours 2FA (hashés, jamais lisibles par le client)
--   2. Journal d'audit des actions sensibles (réinitialisation de mot de passe,
--      utilisation d'un code de secours, etc.)
--   3. (optionnel, en bas de fichier) Durcissement RLS : exiger aal2 pour les
--      comptes qui ont activé la double authentification.
--
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Idempotent : peut être rejoué sans casse.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. CODES DE SECOURS 2FA
--
-- Un code de secours permet de récupérer l'accès au compte quand le téléphone
-- (Google Authenticator / Authy) est perdu. On ne stocke JAMAIS le code en
-- clair : uniquement un hash scrypt avec un sel aléatoire.
--
-- Aucune policy RLS n'est créée -> la table est totalement invisible pour les
-- clients (anon ET authenticated). Seul le backend (service_role) y accède.
-- C'est volontaire : un attaquant qui vole une session aal1 ne doit pas pouvoir
-- lire, ni deviner, ni vider les codes de secours.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_recovery_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  code_hash   text not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.admin_recovery_codes enable row level security;

create index if not exists idx_admin_recovery_codes_user
  on public.admin_recovery_codes (user_id);

-- Défense en profondeur : même si une policy était ajoutée par erreur plus
-- tard, aucun rôle client ne possède le moindre droit sur cette table.
revoke all on public.admin_recovery_codes from anon, authenticated;
revoke all on public.admin_recovery_codes from public;


-- ---------------------------------------------------------------------------
-- 2. JOURNAL D'AUDIT ADMIN
--
-- Trace qui a fait quoi, quand, sur qui. Indispensable dès qu'un administrateur
-- peut réinitialiser le mot de passe d'un autre membre de l'équipe : sans
-- journal, un abus est indétectable.
--
-- Insertion : uniquement par le backend (service_role).
-- Lecture  : le propriétaire du restaurant concerné.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id              bigint generated always as identity primary key,
  actor_user_id   uuid,
  action          text not null,
  target_user_id  uuid,
  restaurant_id   uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create index if not exists idx_admin_audit_log_restaurant
  on public.admin_audit_log (restaurant_id, created_at desc);

create index if not exists idx_admin_audit_log_actor
  on public.admin_audit_log (actor_user_id, created_at desc);

-- Pas de policy INSERT : seul le backend écrit (service_role bypasse RLS).
drop policy if exists "admin_audit_log_select_owner" on public.admin_audit_log;
create policy "admin_audit_log_select_owner"
  on public.admin_audit_log
  for select
  to authenticated
  using (
    restaurant_id in (
      select r.id from public.restaurants r where r.owner_id = auth.uid()
    )
    or actor_user_id = auth.uid()
  );

revoke all on public.admin_audit_log from anon;
grant select on public.admin_audit_log to authenticated;


-- ============================================================================
-- 3. (OPTIONNEL) DURCISSEMENT RLS — exiger la 2FA au niveau base de données
--
-- Les routes admin sont déjà protégées côté React (AdminRoute -> MfaGate).
-- Ce bloc ajoute une SECONDE barrière, côté base : même si quelqu'un contourne
-- le front (curl, onglet restauré, session volée), Postgres refuse.
--
-- Règle appliquée : si l'utilisateur possède au moins un facteur MFA vérifié,
-- alors ses accès aux tables sensibles exigent un JWT en `aal2`. S'il n'en a
-- pas, rien ne change (pas de 2FA = pas de blocage) -> déploiement sans risque
-- de verrouillage.
--
-- ⚠️ À exécuter APRÈS avoir activé la 2FA sur ton propre compte et vérifié que
-- tu arrives encore à te connecter. Décommente puis exécute.
-- ============================================================================

-- create policy "mfa_aal2_restaurants"
--   on public.restaurants
--   as restrictive
--   to authenticated
--   using (
--     (select auth.jwt()->>'aal') = 'aal2'
--     or not exists (
--       select 1 from auth.mfa_factors
--       where user_id = auth.uid() and status = 'verified'
--     )
--   );
--
-- create policy "mfa_aal2_restaurant_staff"
--   on public.restaurant_staff
--   as restrictive
--   to authenticated
--   using (
--     (select auth.jwt()->>'aal') = 'aal2'
--     or not exists (
--       select 1 from auth.mfa_factors
--       where user_id = auth.uid() and status = 'verified'
--     )
--   );
--
-- create policy "mfa_aal2_staff_invitation_tokens"
--   on public.staff_invitation_tokens
--   as restrictive
--   to authenticated
--   using (
--     (select auth.jwt()->>'aal') = 'aal2'
--     or not exists (
--       select 1 from auth.mfa_factors
--       where user_id = auth.uid() and status = 'verified'
--     )
--   );
