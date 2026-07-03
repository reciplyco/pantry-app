import { createAdminClient } from "./supabase/admin";

/**
 * Sliding-window rate limiter backed by Postgres. Returns true if the
 * request is allowed. Opportunistically prunes expired hits for the given
 * key on every call, so the table stays bounded without a cron job.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  await supabase
    .from("rate_limit_hits")
    .delete()
    .eq("key", key)
    .lt("created_at", windowStart);

  const { count } = await supabase
    .from("rate_limit_hits")
    .select("*", { count: "exact", head: true })
    .eq("key", key);

  if ((count ?? 0) >= limit) {
    return false;
  }

  await supabase.from("rate_limit_hits").insert({ key });
  return true;
}
