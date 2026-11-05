-- ============================================================================
-- 022_performance_indexes.sql — Index de performance
--
-- Pourquoi : les requêtes les plus fréquentes filtrent sur restaurant_id
-- (+ status / created_at / session_id). Sans index, Postgres parcourt toute la
-- table à chaque appel. Indétectable en test (quelques dizaines de lignes),
-- pénalisant dès que le volume monte — donc avant une mise en service réelle.
--
-- Sécurité d'exécution : le script vérifie l'existence de chaque table ET de
-- chaque colonne avant de créer quoi que ce soit. Une différence de schéma
-- produit un simple NOTICE au lieu d'une erreur qui interromprait tout le
-- fichier. Réexécutable sans effet de bord.
--
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- ============================================================================

do $$
declare
  spec    record;
  missing text;
  idxname text;
begin
  for spec in
    select * from (
      values
        -- Commandes : la liste du Dashboard (toutes les non payées, triées)
        ('orders'::text,     array['restaurant_id', 'status']::text[]),
        ('orders',           array['restaurant_id', 'created_at']),
        ('orders',           array['session_id']),
        -- Sessions de table : recherche de la session ouverte / en clôture
        ('order_sessions',   array['restaurant_id', 'status']),
        ('order_sessions',   array['restaurant_id', 'table_number', 'status']),
        -- Menu : chargement de la page client
        ('menu_items',       array['restaurant_id', 'available']),
        ('menu_categories',  array['restaurant_id']),
        -- Résolution du rôle au login / à l'ouverture d'une page staff
        ('restaurant_staff', array['user_id']),
        ('restaurant_staff', array['restaurant_id']),
        -- Stats du jour : archive payée depuis minuit (toutes les 60 s)
        ('orders_archive',   array['restaurant_id', 'created_at']),
        ('orders_archive',   array['restaurant_id', 'status', 'created_at']),
        -- Suivi de commande : paiement lié à la commande ou à sa session
        ('payments',         array['order_id']),
        ('payments',         array['session_id']),
        -- Invitations staff par établissement
        ('staff_invitation_tokens', array['restaurant_id'])
    ) as t(tbl, cols)
  loop
    -- 1. La table existe-t-elle ?
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = spec.tbl
    ) then
      raise notice '[022] table absente, index ignoré : %', spec.tbl;
      continue;
    end if;

    -- 2. Toutes les colonnes existent-elles ?
    select string_agg(c, ', ') into missing
    from unnest(spec.cols) as c
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = spec.tbl
        and column_name  = c
    );

    if missing is not null then
      raise notice '[022] colonnes absentes sur %, index ignoré : %', spec.tbl, missing;
      continue;
    end if;

    -- 3. Création (idempotente)
    idxname := 'idx_' || spec.tbl || '_' || array_to_string(spec.cols, '_');

    if exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = idxname
    ) then
      raise notice '[022] déjà présent : %', idxname;
    else
      execute format(
        'create index %I on public.%I (%s)',
        idxname, spec.tbl, array_to_string(spec.cols, ', ')
      );
      raise notice '[022] créé : %', idxname;
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Statistiques du planificateur : sans elles, Postgres peut choisir un plan
-- sous-optimal même avec les bons index. Instantané sur ce volume.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['orders', 'order_sessions', 'orders_archive', 'menu_items', 'menu_categories', 'restaurant_staff', 'payments']
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('analyze public.%I', t);
      raise notice '[022] analyze : %', t;
    end if;
  end loop;
end $$;


-- ============================================================================
-- Vérification (facultative) — doit renvoyer les index créés :
--
--   select tablename, indexname
--   from pg_indexes
--   where schemaname = 'public' and indexname like 'idx_%'
--   order by tablename, indexname;
--
-- Note : ces index sont créés en mode standard (verrou d'écriture bref sur la
-- table). Sur le volume actuel c'est imperceptible ; sur une base très chargée,
-- on utiliserait `create index concurrently` hors transaction.
-- ============================================================================
