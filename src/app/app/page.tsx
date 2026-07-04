import { createClient } from "@/lib/supabase/server";
import { currentWeekStartDateKey, sevenDaysAgoISOString } from "@/lib/dates";
import {
  FREE_TIER_WEEKLY_LIMIT,
  type MealPlanEntryWithRecipe,
  type PantryItem,
  type Profile,
  type Recipe,
  type ShoppingListItem,
} from "@/lib/types";
import Dashboard from "@/components/dashboard/Dashboard";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guarantees a user here; this is just for type narrowing.
  if (!user) return null;

  const weekStartDate = currentWeekStartDateKey();
  const sevenDaysAgo = sevenDaysAgoISOString();

  const [
    { data: profile },
    { data: pantryItems },
    { data: recipes },
    { data: shoppingList },
    { data: mealPlan },
    { count: generationsUsedThisWeek },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase
      .from("pantry_items")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PantryItem[]>(),
    supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Recipe[]>(),
    supabase
      .from("shopping_list_items")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<ShoppingListItem[]>(),
    supabase
      .from("meal_plan_entries")
      .select("*, recipe:recipes(id,title,time_minutes,servings,need_ingredients)")
      .eq("week_start_date", weekStartDate)
      .returns<MealPlanEntryWithRecipe[]>(),
    supabase
      .from("generation_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo),
  ]);

  return (
    <Dashboard
      userId={user.id}
      userEmail={user.email ?? null}
      initialPantryItems={pantryItems ?? []}
      initialRecipes={recipes ?? []}
      initialShoppingList={shoppingList ?? []}
      initialMealPlan={mealPlan ?? []}
      initialWeekStartDate={weekStartDate}
      subscriptionStatus={profile?.subscription_status ?? "free"}
      generationsUsedThisWeek={generationsUsedThisWeek ?? 0}
      freeTierWeeklyLimit={FREE_TIER_WEEKLY_LIMIT}
      initialDietaryPreferences={profile?.dietary_preferences ?? []}
      initialDietaryNotes={profile?.dietary_notes ?? ""}
    />
  );
}
