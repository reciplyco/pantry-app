-- Tiered pricing: Discovery (free) / Essentials / Pro / Ultimate.
-- subscription_status keeps tracking Stripe lifecycle state (free/active/
-- past_due/canceled) exactly as before; subscription_tier separately
-- tracks *which* paid plan they're on. The two combine as: a profile only
-- gets its tier's perks while subscription_status = 'active' — a lapsed
-- or past-due subscription falls back to 'discovery' limits.
alter table public.profiles
  add column subscription_tier text not null default 'discovery'
    check (subscription_tier in ('discovery', 'essentials', 'pro', 'ultimate'));

-- Anyone already actively paying under the old single-tier Pro plan
-- keeps Pro-equivalent treatment rather than being silently dropped to
-- Discovery's much lower generation cap the moment this column exists.
update public.profiles
  set subscription_tier = 'pro'
  where subscription_status = 'active';
