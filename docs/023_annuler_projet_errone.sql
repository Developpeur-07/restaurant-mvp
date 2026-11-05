-- ============================================================================
-- 023_annuler_projet_errone.sql
--
-- À exécuter UNIQUEMENT dans le projet où 021 a été lancé par erreur.
-- Supprime les deux tables créées, sans toucher à rien d'autre.
--
-- ⚠️ Avant toute chose, vérifie dans quel projet tu te trouves :
--    le bon projet a pour URL d'API
--        https://vtgflrwctsqgntmuguvf.supabase.co
--    (Dashboard Supabase → Project Settings → API → Project URL).
--    Si c'est bien celui-ci, N'EXÉCUTE PAS ce fichier.
-- ============================================================================


-- ── Contrôle de sécurité : affiche l'identité du projet avant d'agir ────────
-- Lis le résultat. Si tu vois « Rêve Voilé », c'est le BON projet : arrête-toi.

do $$
declare
  names text;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurants'
  ) then
    select string_agg(name, ', ') into names
    from (select name from public.restaurants order by name limit 5) t;
    raise notice 'PROJET COURANT — restaurants visibles : %', coalesce(names, '(aucun)');
  else
    raise notice 'PROJET COURANT — aucune table public.restaurants : ce n''est pas le projet de l''application.';
  end if;
end $$;


-- ── Nettoyage ──────────────────────────────────────────────────────────────
-- L'ordre importe : admin_audit_log référence restaurants et auth.users.

drop table if exists public.admin_audit_log;
drop table if exists public.admin_recovery_codes;

-- Index créé sur restaurants.owner_id par 021. À ne supprimer que si tu veux
-- vraiment remettre ce projet dans son état exact d'avant.
-- drop index if exists public.idx_restaurants_owner_id;


-- ── Vérification : ces deux requêtes doivent renvoyer 0 ligne ───────────────

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('admin_audit_log', 'admin_recovery_codes');
