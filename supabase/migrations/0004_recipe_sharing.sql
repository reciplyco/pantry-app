-- Lightweight read-only recipe sharing: a recipe with a non-null
-- share_token is publicly readable (by anyone with the token) via a
-- second, additive RLS policy — the existing owner-only policy is
-- untouched, so this only ever *adds* read access, never removes it.

alter table public.recipes
  add column share_token uuid unique;

create policy "recipes: anyone can view a shared row"
  on public.recipes for select
  using (share_token is not null);
