-- Backs a simple sliding-window rate limiter (see src/lib/rate-limit.ts).
-- Only ever touched via the service-role client server-side, so RLS is
-- enabled with no policies (default deny for anon/authenticated roles).

create table public.rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_key_created_at_idx on public.rate_limit_hits (key, created_at);

alter table public.rate_limit_hits enable row level security;
