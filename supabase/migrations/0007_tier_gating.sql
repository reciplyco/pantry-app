-- Real, server/DB-enforced tier gating — not just UI hints.
--
-- The numeric caps below (3/10 favorites, 15 shopping-list items) are
-- duplicated from the Tier objects in src/lib/pricing.ts (favoritesCap,
-- shoppingListCap) because Postgres can't import that file. If those
-- numbers change, update both places.

-- ============================================================================
-- search_log (enforces the per-tier weekly web-search cap, same shape as
-- generation_log)
-- ============================================================================
create table public.search_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index search_log_user_id_created_at_idx
  on public.search_log (user_id, created_at);

alter table public.search_log enable row level security;

create policy "search_log: user can manage own rows"
  on public.search_log for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- Favorites cap — fires on the same UPDATE the app already uses to toggle
-- is_favorite, regardless of which client code path performs it, so there's
-- no separate API route to keep in sync with this rule.
-- ============================================================================
create or replace function public.enforce_favorites_cap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tier text;
  v_status text;
  v_cap int;
  v_count int;
begin
  -- Only the favorite -> true transition can push someone over a cap.
  if new.is_favorite is distinct from true or old.is_favorite is true then
    return new;
  end if;

  select subscription_tier, subscription_status into v_tier, v_status
  from public.profiles where id = new.user_id;

  -- Mirrors effectiveTierId() in pricing.ts: a lapsed/past-due subscription
  -- doesn't keep paid perks; "canceled" (cancel-at-period-end) still does.
  if v_status is distinct from 'active' and v_status is distinct from 'canceled' then
    v_tier := 'discovery';
  end if;

  v_cap := case v_tier
    when 'discovery' then 3
    when 'essentials' then 10
    else null -- pro/ultimate: unlimited
  end;

  if v_cap is not null then
    select count(*) into v_count
    from public.recipes
    where user_id = new.user_id and is_favorite = true;

    if v_count >= v_cap then
      raise exception using message = 'favorites_cap_reached', errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger recipes_favorites_cap_check
  before update of is_favorite on public.recipes
  for each row execute procedure public.enforce_favorites_cap();

-- ============================================================================
-- Shopping-list item cap — fires on insert. A bulk insert (e.g. "add missing
-- ingredients" or "shop for the week") that would cross the cap partway
-- through is rejected as a whole: Postgres aborts the entire statement on
-- the first row that raises, so it's all-or-nothing per action rather than
-- a partial add.
-- ============================================================================
create or replace function public.enforce_shopping_list_cap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tier text;
  v_status text;
  v_cap int;
  v_count int;
begin
  select subscription_tier, subscription_status into v_tier, v_status
  from public.profiles where id = new.user_id;

  if v_status is distinct from 'active' and v_status is distinct from 'canceled' then
    v_tier := 'discovery';
  end if;

  v_cap := case v_tier
    when 'discovery' then 15
    else null -- essentials/pro/ultimate: unlimited
  end;

  if v_cap is not null then
    select count(*) into v_count
    from public.shopping_list_items
    where user_id = new.user_id;

    if v_count >= v_cap then
      raise exception using message = 'shopping_list_cap_reached', errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger shopping_list_items_cap_check
  before insert on public.shopping_list_items
  for each row execute procedure public.enforce_shopping_list_cap();
