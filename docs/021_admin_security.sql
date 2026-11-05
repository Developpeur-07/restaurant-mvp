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
--
-- PRÉREQUIS : public.restaurants doit exister avec ses colonnes id et owner_id.
-- C'est le cas (la table est lue et écrite par l'application, voir
-- src/context/SubscriptionProvider.jsx et src/pages/Onboarding.jsx).
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
--
-- Note sur les privilèges : RLS et privilèges SQL sont deux choses distinctes.
-- Les `revoke` ci-dessous ne visent QUE anon / authenticated / PUBLIC ; le rôle
-- service_role conserve les privilèges par défaut que Supabase lui accorde sur
-- le schéma public (sinon le backend ne pourrait plus écrire).
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
-- Lecture  : le propriétaire du restaurant concerné, ou l'auteur de l'action.
--
-- Clause `actor_user_id = auth.uid()` : elle n'est PAS une faille, elle est
-- nécessaire. Les actions de sécurité (génération de codes de secours,
-- consommation d'un code) ont un restaurant_id NULL : sans cette branche leur
-- auteur ne verrait jamais ses propres entrées. Un compte cuisine ou réception
-- ne peut pas être `actor_user_id` (seul le propriétaire déclenche ces
-- actions), donc cette clause ne lui ouvre rien.
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
    -- `(select auth.uid())` et non `auth.uid()` : Postgres évalue la fonction
    -- UNE fois par requête au lieu d'une fois par ligne. Optimisation RLS
    -- recommandée par Supabase, sensible dès que la table grossit.
    (select auth.uid()) = actor_user_id
    or restaurant_id in (
      select r.id
      from public.restaurants r
      where r.owner_id = (select auth.uid())
    )
  );

revoke all on public.admin_audit_log from anon;
grant select on public.admin_audit_log to authenticated;


-- ---------------------------------------------------------------------------
-- 2 bis. INTÉGRITÉ RÉFÉRENTIELLE DU JOURNAL
--
-- Le journal garde volontairement une trace même quand l'entité visée
-- disparaît : ON DELETE SET NULL plutôt que CASCADE. Une entrée d'audit doit
-- survivre à la suppression d'un compte staff — c'est précisément ce qui
-- permet de comprendre après coup ce qui s'est passé.
--
-- Bloc idempotent : les contraintes ne sont ajoutées que si elles sont absentes.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'admin_audit_log'
      and constraint_name = 'admin_audit_log_actor_fk'
  ) then
    alter table public.admin_audit_log
      add constraint admin_audit_log_actor_fk
      foreign key (actor_user_id) references auth.users (id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'admin_audit_log'
      and constraint_name = 'admin_audit_log_target_fk'
  ) then
    alter table public.admin_audit_log
      add constraint admin_audit_log_target_fk
      foreign key (target_user_id) references auth.users (id) on delete set null;
  end if;

  -- Dépend de public.restaurants : on ne tente la contrainte que si la table
  -- et la colonne existent vraiment.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = 'id'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'admin_audit_log'
      and constraint_name = 'admin_audit_log_restaurant_fk'
  ) then
    alter table public.admin_audit_log
      add constraint admin_audit_log_restaurant_fk
      foreign key (restaurant_id) references public.restaurants (id) on delete set null;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2 ter. INDEX DE LA RECHERCHE DE PROPRIÉTÉ
--
-- La policy ci-dessus fait un `select id from restaurants where owner_id = ...`
-- à chaque lecture du journal. On l'indexe — mais uniquement si aucun index
-- n'existe déjà sur cette colonne (inutile d'en empiler un second).
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = 'owner_id'
  ) and not exists (
    select 1
    from pg_index i
    join pg_class c     on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'restaurants'
      and i.indkey[0] = (
        select attnum from pg_attribute
        where attrelid = c.oid and attname = 'owner_id'
      )
  ) then
    execute 'create index idx_restaurants_owner_id on public.restaurants (owner_id)';
    raise notice '[021] index créé : idx_restaurants_owner_id';
  else
    raise notice '[021] index sur restaurants.owner_id déjà présent ou colonne absente — rien à faire';
  end if;
end $$;


-- ============================================================================
-- NOTES D'EXPLOITATION
--
-- • `create table if not exists` ne réconcilie PAS les colonnes d'une table
--   déjà existante. Ces deux tables sont nouvelles : si tu les as déjà créées
--   avec une forme différente, supprime-les (`drop table`) avant de rejouer
--   ce fichier, sinon les blocs suivants échoueront.
--
-- • La colonne `metadata` est lisible par quiconque peut lire la ligne. Le
--   backend n'y écrit volontairement que des valeurs non sensibles :
--   `{ role }` pour une réinitialisation de mot de passe, `{ success }` pour
--   un code de secours, `{ count }` pour une génération. Jamais d'email, de
--   mot de passe ou de jeton. À conserver ainsi.
--
-- • Si le backend renvoie « permission denied for table admin_audit_log »,
--   c'est un problème de privilèges et non de RLS : vérifier que service_role
--   dispose bien de INSERT sur la table. Aucune policy RLS ne s'applique à lui.
-- ============================================================================


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
--       where user_id = (select auth.uid()) and status = 'verified'
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
--       where user_id = (select auth.uid()) and status = 'verified'
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
--       where user_id = (select auth.uid()) and status = 'verified'
--     )
--   );
