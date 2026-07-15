import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchRecipes } from "@/lib/spoonacular";
import { sevenDaysAgoISOString } from "@/lib/dates";
import { effectiveTierId, getTier } from "@/lib/pricing";
import type { Profile } from "@/lib/types";

const requestSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  maxTime: z.number().int().positive().max(600).optional(),
  cuisines: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  methods: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  diets: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`search-recipes:${user.id}`, 20, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  if (!process.env.SPOONACULAR_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Recipe search isn't configured yet — ask the site owner to add a Spoonacular API key.",
      },
      { status: 503 }
    );
  }

  // Each search costs a real Spoonacular API call, so it's capped per tier
  // the same way generations are — counted over a rolling 7-day window via
  // search_log, checked here rather than left to the client.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_tier")
    .eq("id", user.id)
    .single<Pick<Profile, "subscription_status" | "subscription_tier">>();

  const tier = getTier(
    effectiveTierId(profile?.subscription_status ?? "free", profile?.subscription_tier)
  );

  const { count: usedCount } = await supabase
    .from("search_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgoISOString());

  const remaining = tier.webSearchesPerWeek - (usedCount ?? 0);

  if (remaining <= 0) {
    return NextResponse.json(
      {
        error: "search_limit_reached",
        message:
          tier.id === "ultimate"
            ? `You've used all ${tier.webSearchesPerWeek} web recipe searches this week.`
            : `You've used all ${tier.webSearchesPerWeek} web recipe searches this week. Upgrade for more.`,
      },
      { status: 402 }
    );
  }

  try {
    const results = await searchRecipes(parsed.data);

    const { error: logError } = await supabase
      .from("search_log")
      .insert({ user_id: user.id });
    if (logError) console.error("Failed to write search_log row", logError);

    return NextResponse.json({ results, remaining: remaining - 1 });
  } catch (err) {
    console.error("Recipe search failed", err);
    return NextResponse.json(
      { error: "Recipe search failed. Please try again." },
      { status: 502 }
    );
  }
}
