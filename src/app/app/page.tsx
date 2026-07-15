import { createClient } from "@/lib/supabase/server";
import { currentWeekStartDateKey, sevenDaysAgoISOString } from "@/lib/dates";
import { effectiveTierId, getTier, hasFeature } from "@/lib/pricing";
import { getActiveSubscription, getPendingScheduledChange } from "@/lib/stripe";
import type {
  MealPlanEntryWithRecipe,
  PantryItem,
  Profile,
  Recipe,
  ShoppingListItem,
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

  const [
    { data: profile },
    { data: pantryItems },
    { data: recipes },
    { data: shoppingList },
    { data: mealPlan },
    { count: generationsUsedThisWeek },
    { count: searchesUsedThisWeek },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase
      .from("pantry_items")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<PantryItem[]>(),
    // Fetched generously (well above any tier's history cap) and sliced down
    // below once the tier is known — the tier depends on `profile`, a
    // sibling query in this same Promise.all, so it isn't known yet here.
    supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
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
      .gte("created_at", sevenDaysAgoISOString()),
    supabase
      .from("search_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgoISOString()),
  ]);

  const subscriptionStatus = profile?.subscription_status ?? "free";
  const tier = getTier(
    effectiveTierId(subscriptionStatus, profile?.subscription_tier)
  );

  // History depth is a hard per-tier cap on what's fetched at all. Nutrition
  // is gated at render time instead (see showNutrition below) rather than
  // stripped here — the same recipe objects get reused as the payload when
  // "undo delete" re-inserts a row, and nulling nutrition at this boundary
  // would silently and permanently destroy it on that path.
  const visibleRecipes = tier.historyCap
    ? (recipes ?? []).slice(0, tier.historyCap)
    : (recipes ?? []);

  const pendingChange =
    subscriptionStatus === "active" && profile?.stripe_customer_id
      ? await getActiveSubscription(profile.stripe_customer_id).then((sub) =>
          sub ? getPendingScheduledChange(sub) : null
        )
      : null;

  return (
    <Dashboard
      userId={user.id}
      userEmail={user.email ?? null}
      initialPantryItems={pantryItems ?? []}
      initialRecipes={visibleRecipes}
      initialShoppingList={shoppingList ?? []}
      initialMealPlan={mealPlan ?? []}
      initialWeekStartDate={weekStartDate}
      tierId={tier.id}
      subscriptionStatus={subscriptionStatus}
      subscriptionCurrentPeriodEnd={
        profile?.subscription_current_period_end ?? null
      }
      pendingChange={pendingChange}
      generationsUsedThisWeek={generationsUsedThisWeek ?? 0}
      generationsPerWeek={tier.generationsPerWeek}
      searchesUsedThisWeek={searchesUsedThisWeek ?? 0}
      webSearchesPerWeek={tier.webSearchesPerWeek}
      showNutrition={hasFeature(tier.id, "nutritionInsights")}
      showPantryAnalytics={hasFeature(tier.id, "pantryAnalytics")}
      initialDietaryPreferences={profile?.dietary_preferences ?? []}
      initialDietaryNotes={profile?.dietary_notes ?? ""}
    />
  );
}
