import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`account-export:${user.id}`, 5, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const [
    { data: profile },
    { data: pantryItems },
    { data: recipes },
    { data: shoppingList },
    { data: mealPlan },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("pantry_items").select("*"),
    supabase.from("recipes").select("*"),
    supabase.from("shopping_list_items").select("*"),
    supabase.from("meal_plan_entries").select("*"),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    pantry_items: pantryItems ?? [],
    recipes: recipes ?? [],
    shopping_list_items: shoppingList ?? [],
    meal_plan_entries: mealPlan ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="reciply-data-export.json"',
    },
  });
}
