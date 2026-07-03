import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/anthropic";
import { FREE_TIER_WEEKLY_LIMIT, type Profile } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const pantryItems: string[] = Array.isArray(body?.pantryItems)
    ? body.pantryItems.filter(
        (x: unknown): x is string => typeof x === "string" && x.trim().length > 0
      )
    : [];

  if (pantryItems.length === 0) {
    return NextResponse.json(
      { error: "Add at least one pantry item first." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single<Pick<Profile, "subscription_status">>();

  const isPro = profile?.subscription_status === "active";

  if (!isPro) {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count } = await supabase
      .from("generation_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo);

    if ((count ?? 0) >= FREE_TIER_WEEKLY_LIMIT) {
      return NextResponse.json(
        {
          error: "free_tier_limit_reached",
          message: `You've used all ${FREE_TIER_WEEKLY_LIMIT} free recipe generations this week. Upgrade to Pro for unlimited recipes.`,
        },
        { status: 402 }
      );
    }
  }

  let generated;
  try {
    generated = await generateRecipes(pantryItems);
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
