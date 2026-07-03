-- Default user_id to the requesting user, so client-side inserts (which run
-- under RLS as the authenticated user) don't need to pass user_id explicitly.

alter table public.pantry_items
  alter column user_id set default auth.uid();

alter table public.recipes
  alter column user_id set default auth.uid();

alter table public.shopping_list_items
  alter column user_id set default auth.uid();

alter table public.meal_plan_entries
  alter column user_id set default auth.uid();

alter table public.generation_log
  alter column user_id set default auth.uid();
