-- ============================================================
-- INVENTAIRE / STOCK   (docs/024_inventaire.sql)
-- ------------------------------------------------------------
-- À exécuter dans le projet Supabase de production
-- (le même que 021_admin_security.sql et 022_performance_indexes.sql).
--
-- Crée :
--   - public.stock_items      : les articles en stock d'un restaurant
--   - public.stock_movements  : le journal de chaque entrée / sortie
--   - public.consume_stock_for_order() : décrémente le stock quand une
--     commande est servie (idempotente : ne décrémente jamais deux fois
--     la même commande)
--   - des politiques RLS : tout le personnel du restaurant peut consulter,
--     seuls les comptes admin / réception / propriétaire peuvent modifier.
--
-- Convention du projet : tables en snake_case, RLS activée partout.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

create table if not exists public.stock_items (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references public.restaurants(id) on delete cascade,
  name                 text not null,
  unit                 text not null default 'unité',
  quantity             numeric(12,3) not null default 0 check (quantity >= 0),
  alert_threshold      numeric(12,3) not null default 0 check (alert_threshold >= 0),
  cost_per_unit        numeric(12,2),
  -- Recette : cet article est consommé quand ce plat est vendu.
  -- NULL = article non rattaché à un plat (consommation manuelle).
  menu_item_id         uuid references public.menu_items(id) on delete set null,
  quantity_per_serving numeric(12,3) not null default 1 check (quantity_per_serving > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists stock_items_restaurant_idx
  on public.stock_items (restaurant_id);
create index if not exists stock_items_menu_item_idx
  on public.stock_items (menu_item_id);

create table if not exists public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  -- delta négatif = sortie, positif = entrée
  delta         numeric(12,3) not null,
  reason        text not null
                check (reason in ('order', 'purchase', 'adjustment', 'waste', 'initial')),
  order_id      uuid references public.orders(id) on delete set null,
  note          text,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create index if not exists stock_movements_item_idx
  on public.stock_movements (stock_item_id, created_at desc);
create index if not exists stock_movements_restaurant_idx
  on public.stock_movements (restaurant_id, created_at desc);

-- Idempotence : une seule consommation par couple (commande, article).
create unique index if not exists stock_movements_order_item_uniq
  on public.stock_movements (order_id, stock_item_id)
  where reason = 'order' and order_id is not null;

-- ------------------------------------------------------------
-- 2. TENUE À JOUR DE updated_at
-- ------------------------------------------------------------

create or replace function public.stock_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stock_items_touch on public.stock_items;
create trigger stock_items_touch
  before update on public.stock_items
  for each row execute function public.stock_touch_updated_at();

-- ------------------------------------------------------------
-- 3. AIDES DE SÉCURITÉ
-- ------------------------------------------------------------

-- Le propriétaire n'a pas forcément de ligne restaurant_staff :
-- l'absence de ligne ne doit donc jamais être un motif de refus.
create or replace function public.is_restaurant_staff(p_restaurant uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = p_restaurant and s.user_id = auth.uid()
  )
  or exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant and r.owner_id = auth.uid()
  );
$$;

-- Écriture réservée à l'administration : la cuisine consulte mais ne corrige
-- pas les quantités (c'est le propriétaire qui tient le stock).
create or replace function public.can_manage_stock(p_restaurant uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = p_restaurant
      and s.user_id = auth.uid()
      and s.role in ('admin', 'reception')
  )
  or exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant and r.owner_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------

alter table public.stock_items     enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists stock_items_select on public.stock_items;
create policy stock_items_select on public.stock_items
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists stock_items_write on public.stock_items;
create policy stock_items_write on public.stock_items
  for all to authenticated
  using (public.can_manage_stock(restaurant_id))
  with check (public.can_manage_stock(restaurant_id));

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists stock_movements_insert on public.stock_movements;
create policy stock_movements_insert on public.stock_movements
  for insert to authenticated
  with check (public.can_manage_stock(restaurant_id));

-- ------------------------------------------------------------
-- 5. CONSOMMATION AUTOMATIQUE SUR COMMANDE
-- ------------------------------------------------------------
--
-- orders.items est un JSON de la forme :
--   [ { "id": <menu_item uuid>, "name": "...", "price": 1200, "qty": 2 }, ... ]
--
-- Pour chaque ligne, on déduit de chaque article rattaché au plat :
--   qty × quantity_per_serving
--
-- La fonction est idempotente : si elle est rappelée pour la même commande,
-- le mouvement existe déjà et la quantité n'est pas re-décrémentée.

create or replace function public.consume_stock_for_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid;
  v_items      jsonb;
  v_line       jsonb;
  v_menu_item  uuid;
  v_qty        numeric;
  v_article    record;
  v_deja       boolean;
  v_count      integer := 0;
begin
  select o.restaurant_id, o.items::jsonb
    into v_restaurant, v_items
    from public.orders o
   where o.id = p_order_id;

  if v_restaurant is null or v_items is null then
    return 0;
  end if;

  -- Garde-fou : une anomalie de stock ne doit JAMAIS empêcher une commande
  -- d'avancer en plein service. Si quoi que ce soit échoue, on avale
  -- l'erreur et on renvoie 0 — le service continue, le stock sera corrigé à
  -- la main depuis l'écran d'inventaire.
  begin

  for v_line in select * from jsonb_array_elements(v_items)
  loop
    -- Conversion sûre : un identifiant malformé dans une ancienne commande
    -- ne doit pas faire échouer le cast, donc le déclencheur, donc la mise
    -- à jour du statut de la commande.
    if v_line ->> 'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      v_menu_item := (v_line ->> 'id')::uuid;
    else
      v_menu_item := null;
    end if;

    v_qty := coalesce(nullif(v_line ->> 'qty', '')::numeric, 1);

    continue when v_menu_item is null or v_qty <= 0;

    for v_article in
      select s.id, s.quantity_per_serving
        from public.stock_items s
       where s.restaurant_id = v_restaurant
         and s.menu_item_id  = v_menu_item
    loop
      -- Idempotence : a-t-on déjà consommé cet article pour cette commande ?
      select exists (
        select 1 from public.stock_movements m
         where m.order_id      = p_order_id
           and m.stock_item_id = v_article.id
           and m.reason        = 'order'
      ) into v_deja;

      if v_deja then
        continue;
      end if;

      insert into public.stock_movements
        (restaurant_id, stock_item_id, delta, reason, order_id, note)
      values
        (v_restaurant, v_article.id,
         - (v_qty * v_article.quantity_per_serving),
         'order', p_order_id, 'Consommation commande');

      update public.stock_items s
         set quantity   = greatest(0, s.quantity - (v_qty * v_article.quantity_per_serving)),
             updated_at = now()
       where s.id = v_article.id;

      v_count := v_count + 1;
    end loop;
  end loop;

  exception when others then
    -- On ne propage jamais : voir le garde-fou en tête de fonction.
    return 0;
  end;

  return v_count;
end;
$$;

-- Fonction du déclencheur (à créer AVANT le déclencheur qui s'y réfère).
create or replace function public.orders_consume_stock_fn()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.consume_stock_for_order(new.id);
  return new;
end;
$$;

-- Déclencheur automatique : le stock tombe quand la commande passe à « servie ».
-- Si votre cycle de statuts utilise une autre valeur, adaptez la liste
-- ci-dessous (elle couvre volontairement plusieurs écritures possibles).
drop trigger if exists orders_consume_stock on public.orders;
create trigger orders_consume_stock
  after update of status on public.orders
  for each row
  when (new.status in ('served', 'servie', 'done', 'closed'))
  execute function public.orders_consume_stock_fn();

-- ------------------------------------------------------------
-- 6. VÉRIFICATION
-- ------------------------------------------------------------
-- Doit renvoyer les deux tables avec RLS activée :
--
--   select relname, relrowsecurity
--     from pg_class
--    where relname in ('stock_items', 'stock_movements');
