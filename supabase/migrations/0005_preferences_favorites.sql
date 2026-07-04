alter table public.profiles
  add column dietary_preferences text[] not null default '{}',
  add column dietary_notes text;

alter table public.recipes
  add column is_favorite boolean not null default false;
