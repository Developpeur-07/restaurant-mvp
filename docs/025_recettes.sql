-- ============================================================
-- 025 — RECETTES : un article partagé entre plusieurs plats
-- ============================================================
--
-- Pourquoi ce script : dans 024, un article de stock ne pouvait être rattaché
-- qu'à UN seul plat (colonne stock_items.menu_item_id). Or le même poulet
-- sert dans trois plats. Avec un lien unique, il aurait fallu créer trois
-- lignes « Poulet », chacune avec son propre stock : le total affiché aurait
-- été faux. C'est précisément ce qui fait perdre confiance dans un inventaire.
--
-- On passe à une vraie recette, plusieurs-à-plusieurs :
--   menu_item_recipes(menu_item_id, stock_item_id, quantité par portion)
--
-- À exécuter APRÈS 024. Rejouable tel quel.
-- ============================================================

create table if not exists public.menu_item_recipes (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id         uuid not null references public.menu_items(id) on delete cascade,
  stock_item_id        uuid not null references public.stock_items(id) on delete cascade,
  quantity_per_serving numeric(12,3) not null default 1 check (quantity_per_serving > 0),
  created_at           timestamptz not null default now(),
  -- Un plat n'emploie pas deux fois le même article.
  unique (menu_item_id, stock_item_id)
);

create index if not exists menu_item_recipes_stock_idx
  on public.menu_item_recipes (stock_item_id);
create index if not exists menu_item_recipes_menu_idx
  on public.menu_item_recipes (menu_item_id);

-- Reprise des liens déjà saisis avec l'ancien modèle. Les tables sont vides en
-- pratique, mais la reprise ne coûte rien et évite une mauvaise surprise.
insert into public.menu_item_recipes (restaurant_id, menu_item_id, stock_item_id, quantity_per_serving)
select s.restaurant_id, s.menu_item_id, s.id, s.quantity_per_serving
  from public.stock_items s
 where s.menu_item_id is not null
on conflict (menu_item_id, stock_item_id) do nothing;

-- On retire l'ancien lien unique : deux mécanismes concurrents finiraient
-- toujours par se contredire.
drop index if exists public.stock_items_menu_item_idx;
alter table public.stock_items drop column if exists menu_item_id;
alter table public.stock_items drop column if exists quantity_per_serving;

-- ------------------------------------------------------------
-- RLS — mêmes règles que le stock (conditions en ligne, cf. 024)
-- ------------------------------------------------------------

alter table public.menu_item_recipes enable row level security;

drop policy if exists menu_item_recipes_select on public.menu_item_recipes;
create policy menu_item_recipes_select on public.menu_item_recipes
  for select to authenticated
  using (
       exists (select 1 from public.restaurant_staff s
                where s.restaurant_id = menu_item_recipes.restaurant_id
                  and s.user_id = auth.uid())
    or exists (select 1 from public.restaurants r
                where r.id = menu_item_recipes.restaurant_id
                  and r.owner_id = auth.uid())
  );

drop policy if exists menu_item_recipes_write on public.menu_item_recipes;
create policy menu_item_recipes_write on public.menu_item_recipes
  for all to authenticated
  using (
       exists (select 1 from public.restaurant_staff s
                where s.restaurant_id = menu_item_recipes.restaurant_id
                  and s.user_id = auth.uid()
                  and s.role in ('admin', 'reception'))
    or exists (select 1 from public.restaurants r
                where r.id = menu_item_recipes.restaurant_id
                  and r.owner_id = auth.uid())
  )
  with check (
       exists (select 1 from public.restaurant_staff s
                where s.restaurant_id = menu_item_recipes.restaurant_id
                  and s.user_id = auth.uid()
                  and s.role in ('admin', 'reception'))
    or exists (select 1 from public.restaurants r
                where r.id = menu_item_recipes.restaurant_id
                  and r.owner_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Consommation : on lit désormais la recette
-- ------------------------------------------------------------
-- Le déclencheur orders_consume_stock reste celui de 024 et n'a pas besoin
-- d'être recréé : il appelle cette fonction, seule son contenu change.

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
      select r.stock_item_id as id, r.quantity_per_serving
        from public.menu_item_recipes r
       where r.menu_item_id  = v_menu_item
         and r.restaurant_id = v_restaurant
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

-- Fin du script 025.
