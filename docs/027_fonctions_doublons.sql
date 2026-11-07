-- ============================================================
-- 027 — UNE SEULE version de is_restaurant_staff
-- ============================================================
--
-- Pourquoi : cette base possède plusieurs versions de is_restaurant_staff,
-- apparues en dehors des migrations du dépôt (aucune migration 018 à 023 ne la
-- crée — vérifié par recherche dans docs/). Deux candidats pour un appel à un
-- seul argument, et Postgres refuse de choisir :
--   ERROR 42725: function public.is_restaurant_staff(uuid) is not unique
--
-- Ce script ramène la base à une version unique et canonique.
--
-- SÉCURITÉ : il se REFUSE à agir s'il trouve un appel à plus d'un argument
-- quelque part dans la base. Supprimer une surcharge ne prévient pas les
-- politiques RLS qui l'utilisent — Postgres ne trace pas ces dépendances —
-- elles se mettraient à échouer à l'exécution, silencieusement. D'où le
-- garde-fou.

do $$
declare
  v_multi  integer := 0;
  v_liste  text := '';
  rec      record;
begin
  -- ── 1. Inventaire : quelles surcharges existe-t-il ? ──────────────────
  for rec in
    select pg_get_function_identity_arguments(p.oid) as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'is_restaurant_staff'
  loop
    v_liste := v_liste || rec.sig || '  |  ';
  end loop;

  raise notice '027 — surcharges trouvées : %',
    case when v_liste = '' then 'aucune' else v_liste end;

  -- ── 2. Garde-fou : quelqu'un appelle-t-il avec plusieurs arguments ? ──
  -- On cherche une virgule à l'intérieur des parenthèses de l'appel.
  -- Un faux positif fait avorter le script : c'est le sens prudent.
  select count(*) into v_multi
    from pg_proc p
   where p.prosrc ~ 'is_restaurant_staff\s*\([^)]*,';

  if v_multi > 0 then
    raise exception
      '027 interrompu : % objet(s) appellent is_restaurant_staff avec PLUSIEURS '
      'arguments. Les supprimer casserait ces appels à l''exécution. Adapter ce '
      'script au cas réel avant de continuer.', v_multi;
  end if;

  -- ── 3. On repart d'une seule version ─────────────────────────────────
  for rec in
    select pg_get_function_identity_arguments(p.oid) as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'is_restaurant_staff'
  loop
    execute format('drop function public.is_restaurant_staff(%s)', rec.sig);
    raise notice '027 — supprimé : is_restaurant_staff(%)', rec.sig;
  end loop;

  execute $ddl$
    create function public.is_restaurant_staff(p_restaurant uuid)
    returns boolean
    language sql stable security definer set search_path = public as $$
      select exists (
        select 1 from public.restaurant_staff s
         where s.restaurant_id = p_restaurant
           and s.user_id = auth.uid()
      )
      or exists (
        select 1 from public.restaurants r
         where r.id = p_restaurant
           and r.owner_id = auth.uid()
      );
    $$;
  $ddl$;

  raise notice '027 — terminé : une seule version, is_restaurant_staff(uuid).';
end $$;

-- Vérification : il ne doit rester qu'une ligne.
select pg_get_function_identity_arguments(p.oid) as signature_restante
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'is_restaurant_staff';
