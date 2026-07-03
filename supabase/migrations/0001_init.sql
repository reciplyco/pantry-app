-- Pantry app schema
-- Run this in the Supabase SQL editor, or via `supabase db push` if using the CLI.

create extension if not exists pgcrypto;

-- ============================================================================
-- profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'past_due', 'canceled')),
  subscription_current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- pantry_items
-- ============================================================================
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index pantry_items_user_id_idx on public.pantry_items (user_id);

-- ============================================================================
-- recipes
-- ============================================================================
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  time_minutes int,
  servings int,
  have_ingredients jsonb not null default '[]'::jsonb,
  need_ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  nutrition jsonb,
  created_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);

-- ============================================================================
-- shopping_list_items
-- ============================================================================
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  quantity text,
  source_recipe_id uuid references public.recipes (id) on delete set null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_list_items_user_id_idx on public.shopping_list_items (user_id);

-- ============================================================================
-- meal_plan_entries
-- ============================================================================
create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day text not null check (day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  week_start_date date not null,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index meal_plan_entries_user_id_week_idx
  on public.meal_plan_entries (user_id, week_start_date);

-- ============================================================================
-- generation_log (enforces the free-tier weekly cap)
-- ============================================================================
create table public.generation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index generation_log_user_id_created_at_idx
  on public.generation_log (user_id, created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.generation_log enable row level security;

create policy "profiles: user can view own row"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: user can update own row"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policy for profiles: rows are created by the
-- on_auth_user_created trigger (runs as security definer) and cleaned up
-- via cascade when the auth.users row is deleted.

create policy "pantry_items: user can manage own rows"
  on public.pantry_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "recipes: user can manage own rows"
  on public.recipes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "shopping_list_items: user can manage own rows"
  on public.shopping_list_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meal_plan_entries: user can manage own rows"
  on public.meal_plan_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "generation_log: user can manage own rows"
  on public.generation_log for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
