import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { sevenDaysAgoISOString } from "@/lib/dates";
import { effectiveTierId, getTier, hasFeature } from "@/lib/pricing";
import { DAYS, type Day, type MealPlanEntryWithRecipe, type Profile } from "@/lib/types";

const requestSchema = z.object({
  pantryItems: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Add some pantry items first.")
    .max(40),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid week."),
  // The specific days the client determined don't already have a meal
  // planned this week — bulk-prep only ever fills gaps, never overwrites.
  days: z.array(z.enum(DAYS as [Day, ...Day[]])).min(1).max(7),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`plan-week:${user.id}`, 5, 300);
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

  const { pantryItems, weekStartDate } = parsed.data;
  const days = Array.from(new Set(parsed.data.days));

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_tier, dietary_preferences, dietary_notes")
    .eq("id", user.id)
    .single<
      Pick<
        Profile,
        | "subscription_status"
        | "subscription_tier"
        | "dietary_preferences"
        | "dietary_notes"
      >
    >();

  const tier = getTier(
    effectiveTierId(profile?.subscription_status ?? "free", profile?.subscription_tier)
  );

  if (!hasFeature(tier.id, "bulkMealPrep")) {
    return NextResponse.json(
      { error: "Bulk meal-prep planning is an Ultimate feature." },
      { status: 403 }
    );
  }

  const { count: usedCount } = await supabase
    .from("generation_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgoISOString());

  const remaining = tier.generationsPerWeek - (usedCount ?? 0);

  if (remaining < days.length) {
    return NextResponse.json(
      {
        error: "generation_limit_reached",
        message: `Planning ${days.length} day${days.length === 1 ? "" : "s"} needs ${days.length} generations, but you only have ${remaining} left this week.`,
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
      undefined,
      false,
      days.length
    );
  } catch (err) {
    console.error("Plan-week generation failed", err);
    return NextResponse.json(
      { error: "Couldn't generate your week's recipes. Please try again." },
      { status: 502 }
    );
  }

  const { error: logError } = await supabase
    .from("generation_log")
    .insert(Array.from({ length: days.length }, () => ({ user_id: user.id })));
  if (logError) console.error("Failed to write generation_log rows", logError);

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

  const { data: insertedRecipes, error: insertError } = await supabase
    .from("recipes")
    .insert(rowsToInsert)
    .select("*");

  if (insertError || !insertedRecipes) {
    console.error("Failed to save generated recipes", insertError);
    return NextResponse.json(
      { error: "Recipes were generated but couldn't be saved." },
      { status: 500 }
    );
  }

  const entriesToInsert = days.map((day, i) => ({
    user_id: user.id,
    day,
    week_start_date: weekStartDate,
    recipe_id: insertedRecipes[i].id,
  }));

  const { data: insertedEntries, error: entryError } = await supabase
    .from("meal_plan_entries")
    .insert(entriesToInsert)
    .select("*, recipe:recipes(id,title,time_minutes,servings,need_ingredients)")
    .returns<MealPlanEntryWithRecipe[]>();

  if (entryError || !insertedEntries) {
    console.error("Failed to save meal plan entries", entryError);
    return NextResponse.json(
      { error: "Recipes were generated and saved, but couldn't be added to your plan." },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipes: insertedRecipes, entries: insertedEntries });
}
