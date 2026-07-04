import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { thirtyDaysAgoISOString } from "@/lib/dates";
import { effectiveTierId, getTier } from "@/lib/pricing";
import type { Profile } from "@/lib/types";

const requestSchema = z.object({
  pantryItems: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Add at least one pantry item first.")
    .max(40),
  customInstructions: z.string().trim().max(100).optional(),
  pantryOnly: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`generate-recipes:${user.id}`, 10, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
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

  const { pantryItems, customInstructions, pantryOnly } = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "subscription_status, subscription_tier, subscription_current_period_end, dietary_preferences, dietary_notes"
    )
    .eq("id", user.id)
    .single<
      Pick<
        Profile,
        | "subscription_status"
        | "subscription_tier"
        | "subscription_current_period_end"
        | "dietary_preferences"
        | "dietary_notes"
      >
    >();

  const tier = getTier(
    effectiveTierId(
      profile?.subscription_status ?? "free",
      profile?.subscription_tier,
      profile?.subscription_current_period_end
    )
  );

  const { count } = await supabase
    .from("generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", thirtyDaysAgoISOString());

  if ((count ?? 0) >= tier.generationsPerMonth) {
    return NextResponse.json(
      {
        error: "generation_limit_reached",
        message:
          tier.id === "ultimate"
            ? `You've used all ${tier.generationsPerMonth} recipe generations this month.`
            : `You've used all ${tier.generationsPerMonth} recipe generations this month. Upgrade for more.`,
      },
      { status: 402 }
    );
  }

  let generated;
  try {
    generated = await generateRecipes(
      pantryItems,
      {
        preferences: profile?.dietary_preferences ?? [],
        notes: profile?.dietary_notes ?? null,
      },
      customInstructions,
      pantryOnly
    );
  } catch (err) {
    console.error("Recipe generation failed", err);
    return NextResponse.json(
      { error: "Recipe generation failed. Please try again." },
      { status: 502 }
    );
  }

  const { error: logError } = await supabase
    .from("generation_log")
    .insert({ user_id: user.id });
  if (logError) console.error("Failed to write generation_log row", logError);

  const rowsToInsert = generated.map((r) => ({
    user_id: user.id,
    title: r.title,
    time_minutes: r.time_minutes,
    servings: r.servings,
    have_ingredients: r.have_ingredients,
    need_ingredients: r.need_ingredients,
    steps: r.steps,
    nutrition: r.nutrition,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("recipes")
    .insert(rowsToInsert)
    .select("*");

  if (insertError) {
    console.error("Failed to save generated recipes", insertError);
    return NextResponse.json(
      { error: "Recipes were generated but couldn't be saved." },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipes: inserted });
}
