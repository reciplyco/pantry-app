"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, currentWeekStartDateKey, toDateKey } from "@/lib/dates";
import { AnalyticsEvent, identifyUser, track } from "@/lib/analytics";
import { hasFeature } from "@/lib/pricing";
import AppHeader from "@/components/AppHeader";
import type { PendingScheduledChange } from "@/lib/stripe";
import type {
  Day,
  MealPlanEntryWithRecipe,
  PantryItem,
  Recipe,
  ShoppingListItem,
  SubscriptionStatus,
  SubscriptionTier,
} from "@/lib/types";
import { DAY_LABELS, DAYS } from "@/lib/types";
import PantryTab from "./PantryTab";
import PantryAnalyticsPanel from "./PantryAnalyticsPanel";
import GenerateTab from "./GenerateTab";
import SearchTab from "./SearchTab";
import RecipeGrid from "./RecipeGrid";
import ShoppingList from "./ShoppingList";
import MealPlanner from "./MealPlanner";
import OnboardingChecklist from "./OnboardingChecklist";
import ReminderBanner from "./ReminderBanner";
import Toast, { type ToastState } from "./Toast";
import AppTabs, { type DashboardTab } from "./AppTabs";

type Props = {
  userId: string;
  userEmail: string | null;
  initialPantryItems: PantryItem[];
  initialRecipes: Recipe[];
  initialShoppingList: ShoppingListItem[];
  initialMealPlan: MealPlanEntryWithRecipe[];
  initialWeekStartDate: string;
  tierId: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  pendingChange: PendingScheduledChange | null;
  generationsUsedThisWeek: number;
  generationsPerWeek: number;
  searchesUsedThisWeek: number;
  webSearchesPerWeek: number;
  showNutrition: boolean;
  showPantryAnalytics: boolean;
  initialDietaryPreferences: string[];
  initialDietaryNotes: string;
};

export default function Dashboard({
  userId,
  userEmail,
  initialPantryItems,
  initialRecipes,
  initialShoppingList,
  initialMealPlan,
  initialWeekStartDate,
  tierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  pendingChange,
  generationsUsedThisWeek,
  generationsPerWeek,
  searchesUsedThisWeek,
  webSearchesPerWeek,
  showNutrition,
  showPantryAnalytics,
  initialDietaryPreferences,
  initialDietaryNotes,
}: Props) {
  const supabase = createClient();

  useEffect(() => {
    identifyUser(userId, userEmail);
  }, [userId, userEmail]);

  const [pantryItems, setPantryItems] = useState(initialPantryItems);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [shoppingList, setShoppingList] = useState(initialShoppingList);
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [weekStartDate, setWeekStartDate] = useState(initialWeekStartDate);
  const [usedThisWeek, setUsedThisWeek] = useState(generationsUsedThisWeek);
  const [searchesUsed, setSearchesUsed] = useState(searchesUsedThisWeek);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("generate");
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [customInstructions, setCustomInstructions] = useState("");
  const [pantryOnly, setPantryOnly] = useState(false);
  const [recipeCount, setRecipeCount] = useState<1 | 5>(1);
  const [planningWeek, setPlanningWeek] = useState(false);

  const remaining = Math.max(0, generationsPerWeek - usedThisWeek);
  const searchesRemaining = Math.max(0, webSearchesPerWeek - searchesUsed);
  const multiDayAllowed = hasFeature(tierId, "multiDayPlanning");
  const bulkMealPrepAllowed = hasFeature(tierId, "bulkMealPrep");

  function isSelected(id: string) {
    return !deselectedIds.has(id);
  }

  function toggleSelected(id: string) {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allSelected = pantryItems.every((item) => isSelected(item.id));

  function toggleSelectAll() {
    setDeselectedIds(
      allSelected ? new Set(pantryItems.map((item) => item.id)) : new Set()
    );
  }

  const selectedItems = pantryItems.filter((item) => isSelected(item.id));
  const selectedNames = selectedItems.map((item) => item.name);

  function showToast(message: string, onUndo?: () => void) {
    setToast({ id: Date.now(), message, onUndo });
  }

  async function addPantryItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("pantry_items")
      .insert({ name: trimmed })
      .select("*")
      .single<PantryItem>();
    if (!error && data) {
      setPantryItems((prev) => [...prev, data]);
      track(AnalyticsEvent.PantryItemAdded);
    }
  }

  async function removePantryItem(id: string) {
    const removed = pantryItems.find((p) => p.id === id);
    setPantryItems((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("pantry_items").delete().eq("id", id);
    if (removed) {
      showToast(`Removed "${removed.name}"`, () => addPantryItem(removed.name));
    }
  }

  async function runGenerate(payload: {
    pantryItems: string[];
    customInstructions?: string;
    pantryOnly?: boolean;
    recipeCount: 1 | 5;
    suggestForMe?: boolean;
  }) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setGenerateError(body.message ?? body.error ?? "Something went wrong.");
        return;
      }
      setRecipes((prev) => [...(body.recipes as Recipe[]), ...prev]);
      setUsedThisWeek((prev) => prev + payload.recipeCount);
      track(AnalyticsEvent.RecipeGenerated, {
        count: (body.recipes as Recipe[]).length,
        suggestForMe: payload.suggestForMe ?? false,
      });
      // Recipes now live on their own tab — jump there so the results of
      // clicking Generate are actually visible instead of appearing to
      // do nothing.
      setActiveTab("recipes");
    } catch {
      setGenerateError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerate() {
    if (selectedNames.length === 0) {
      setGenerateError("Select at least one pantry item first.");
      return;
    }
    await runGenerate({
      pantryItems: selectedNames,
      customInstructions: customInstructions.trim() || undefined,
      pantryOnly,
      recipeCount,
    });
  }

  async function handleSuggestForMe() {
    if (pantryItems.length === 0) {
      setGenerateError("Add some pantry items first.");
      return;
    }
    await runGenerate({
      pantryItems: pantryItems.map((item) => item.name),
      recipeCount: 1,
      suggestForMe: true,
    });
  }

  async function deleteRecipe(recipe: Recipe) {
    setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    await supabase.from("recipes").delete().eq("id", recipe.id);
    showToast(`Deleted "${recipe.title}"`, async () => {
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          title: recipe.title,
          time_minutes: recipe.time_minutes,
          servings: recipe.servings,
          have_ingredients: recipe.have_ingredients,
          need_ingredients: recipe.need_ingredients,
          steps: recipe.steps,
          nutrition: recipe.nutrition,
          is_favorite: recipe.is_favorite,
          share_token: recipe.share_token,
        })
        .select("*")
        .single<Recipe>();
      if (!error && data) setRecipes((prev) => [data, ...prev]);
    });
  }

  async function toggleShare(recipe: Recipe) {
    const newToken = recipe.share_token ? null : crypto.randomUUID();
    const { data, error } = await supabase
      .from("recipes")
      .update({ share_token: newToken })
      .eq("id", recipe.id)
      .select("*")
      .single<Recipe>();
    if (!error && data) {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? data : r)));
      if (newToken) track(AnalyticsEvent.RecipeShared);
    }
  }

  async function toggleFavorite(recipe: Recipe) {
    const { data, error } = await supabase
      .from("recipes")
      .update({ is_favorite: !recipe.is_favorite })
      .eq("id", recipe.id)
      .select("*")
      .single<Recipe>();
    if (!error && data) {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? data : r)));
      return;
    }
    // Raised by the recipes_favorites_cap_check trigger (see migrations) —
    // enforced in Postgres, not just hidden in the UI, since this update
    // goes straight from the browser to Supabase with no server route
    // in between to check tier against.
    if (error?.message === "favorites_cap_reached") {
      showToast("You've hit your plan's favorites limit — upgrade for more.");
    }
  }

  async function addShoppingItem(name: string, quantity: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({ name: trimmed, quantity: quantity.trim() || null })
      .select("*")
      .single<ShoppingListItem>();
    if (!error && data) {
      setShoppingList((prev) => [...prev, data]);
      track(AnalyticsEvent.ShoppingListItemAdded);
      return;
    }
    if (error?.message === "shopping_list_cap_reached") {
      showToast("Your shopping list is full on this plan — upgrade for unlimited items.");
    }
  }

  async function addNeedIngredientsToShoppingList(recipe: Recipe) {
    const existingNames = new Set(
      shoppingList.map((i) => i.name.trim().toLowerCase())
    );
    const toInsert = recipe.need_ingredients
      .filter((ing) => !existingNames.has(ing.name.trim().toLowerCase()))
      .map((ing) => ({
        name: ing.name,
        quantity: ing.quantity || null,
        source_recipe_id: recipe.id,
      }));
    if (toInsert.length === 0) {
      showToast("Already on your shopping list.");
      return;
    }
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert(toInsert)
      .select("*")
      .returns<ShoppingListItem[]>();
    if (!error && data) {
      setShoppingList((prev) => [...prev, ...data]);
      track(AnalyticsEvent.ShoppingListItemAdded, { count: data.length });
      // Shopping List is its own tab now, so without a toast this action
      // would have no visible confirmation at all.
      showToast(
        `Added ${data.length} item${data.length === 1 ? "" : "s"} to shopping list`
      );
      return;
    }
    // The whole batch is rejected together if it would push a capped plan
    // over its limit — see the shopping_list_items_cap_check trigger.
    if (error?.message === "shopping_list_cap_reached") {
      showToast("Your shopping list is full on this plan — upgrade for unlimited items.");
    }
  }

  async function toggleShoppingItem(id: string, checked: boolean) {
    setShoppingList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked } : i))
    );
    await supabase.from("shopping_list_items").update({ checked }).eq("id", id);
  }

  async function removeShoppingItem(id: string) {
    const removed = shoppingList.find((i) => i.id === id);
    setShoppingList((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_list_items").delete().eq("id", id);
    if (removed) {
      showToast(`Removed "${removed.name}"`, () =>
        addShoppingItem(removed.name, removed.quantity ?? "")
      );
    }
  }

  async function clearCheckedShoppingItems() {
    const removed = shoppingList.filter((i) => i.checked);
    const ids = removed.map((i) => i.id);
    if (ids.length === 0) return;
    setShoppingList((prev) => prev.filter((i) => !i.checked));
    await supabase.from("shopping_list_items").delete().in("id", ids);
    showToast(
      `Cleared ${removed.length} checked item${removed.length === 1 ? "" : "s"}`,
      async () => {
        const { data } = await supabase
          .from("shopping_list_items")
          .insert(
            removed.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              source_recipe_id: i.source_recipe_id,
              checked: false,
            }))
          )
          .select("*")
          .returns<ShoppingListItem[]>();
        if (data) setShoppingList((prev) => [...prev, ...data]);
      }
    );
  }

  async function loadWeek(newWeekStartDate: string) {
    const { data } = await supabase
      .from("meal_plan_entries")
      .select("*, recipe:recipes(id,title,time_minutes,servings,need_ingredients)")
      .eq("week_start_date", newWeekStartDate)
      .returns<MealPlanEntryWithRecipe[]>();
    setWeekStartDate(newWeekStartDate);
    setMealPlan(data ?? []);
  }

  function goToWeek(offsetWeeks: number) {
    const current = new Date(`${weekStartDate}T00:00:00`);
    const next = addDays(current, offsetWeeks * 7);
    loadWeek(toDateKey(next));
  }

  async function addToMealPlan(recipeId: string, day: Day) {
    const { data, error } = await supabase
      .from("meal_plan_entries")
      .insert({ recipe_id: recipeId, day, week_start_date: weekStartDate })
      .select("*, recipe:recipes(id,title,time_minutes,servings,need_ingredients)")
      .single<MealPlanEntryWithRecipe>();
    if (!error && data) {
      setMealPlan((prev) => [...prev, data]);
      track(AnalyticsEvent.MealPlanEntryAdded);
      // Schedule is its own tab now, so without a toast this action would
      // have no visible confirmation at all.
      showToast(`Added "${data.recipe?.title ?? "recipe"}" to ${DAY_LABELS[day]}`);
    }
  }

  async function shopForWeek() {
    const existingNames = new Set(
      shoppingList.map((i) => i.name.trim().toLowerCase())
    );
    const seen = new Set<string>();
    const toInsert: {
      name: string;
      quantity: string | null;
      source_recipe_id: string;
    }[] = [];

    for (const entry of mealPlan) {
      if (!entry.recipe) continue;
      for (const ing of entry.recipe.need_ingredients) {
        const key = ing.name.trim().toLowerCase();
        if (existingNames.has(key) || seen.has(key)) continue;
        seen.add(key);
        toInsert.push({
          name: ing.name,
          quantity: ing.quantity || null,
          source_recipe_id: entry.recipe.id,
        });
      }
    }

    if (toInsert.length === 0) {
      showToast("Nothing new to add — your shopping list already has it covered.");
      return;
    }

    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert(toInsert)
      .select("*")
      .returns<ShoppingListItem[]>();
    if (!error && data) {
      setShoppingList((prev) => [...prev, ...data]);
      track(AnalyticsEvent.ShoppingListItemAdded, {
        count: data.length,
        source: "shop_for_week",
      });
      showToast(
        `Added ${data.length} item${data.length === 1 ? "" : "s"} for this week's meals`
      );
      return;
    }
    if (error?.message === "shopping_list_cap_reached") {
      showToast("Your shopping list is full on this plan — upgrade for unlimited items.");
    }
  }

  async function handlePlanWeek() {
    const emptyDays = DAYS.filter(
      (day) => !mealPlan.some((entry) => entry.day === day)
    );
    if (emptyDays.length === 0) {
      showToast("Your week's already fully planned.");
      return;
    }
    if (pantryItems.length === 0) {
      showToast("Add some pantry items first.");
      return;
    }
    setPlanningWeek(true);
    try {
      const res = await fetch("/api/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pantryItems: pantryItems.map((item) => item.name),
          weekStartDate,
          days: emptyDays,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message ?? body.error ?? "Couldn't plan your week.");
        return;
      }
      setRecipes((prev) => [...(body.recipes as Recipe[]), ...prev]);
      setMealPlan((prev) => [...prev, ...(body.entries as MealPlanEntryWithRecipe[])]);
      setUsedThisWeek((prev) => prev + emptyDays.length);
      track(AnalyticsEvent.RecipeGenerated, {
        count: emptyDays.length,
        planWeek: true,
      });
      showToast(
        `Planned ${emptyDays.length} day${emptyDays.length === 1 ? "" : "s"} for you.`
      );
    } catch {
      showToast("Couldn't plan your week. Please try again.");
    } finally {
      setPlanningWeek(false);
    }
  }

  async function removeMealPlanEntry(id: string) {
    const removed = mealPlan.find((e) => e.id === id);
    setMealPlan((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("meal_plan_entries").delete().eq("id", id);
    if (removed) {
      showToast(
        `Removed "${removed.recipe?.title ?? "recipe"}" from ${removed.day}`,
        () => addToMealPlan(removed.recipe_id, removed.day)
      );
    }
  }

  return (
    <>
      <AppHeader
        tierId={tierId}
        subscriptionStatus={subscriptionStatus}
        subscriptionCurrentPeriodEnd={subscriptionCurrentPeriodEnd}
        pendingChange={pendingChange}
        tabs={
          <AppTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            pantryCount={pantryItems.length}
            selectedCount={selectedNames.length}
            recipeCount={recipes.length}
            shoppingCount={shoppingList.length}
            scheduleCount={mealPlan.length}
          />
        }
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <OnboardingChecklist
          hasPantryItems={pantryItems.length > 0}
          hasRecipes={recipes.length > 0}
          hasShoppingListItems={shoppingList.length > 0}
          hasMealPlanEntries={mealPlan.length > 0}
        />

        <ReminderBanner
          weekStartDate={weekStartDate}
          isCurrentWeek={weekStartDate === currentWeekStartDateKey()}
          hasMealPlanEntries={mealPlan.length > 0}
        />

        {activeTab === "pantry" && (
          <>
            <PantryTab
              pantryItems={pantryItems}
              onAdd={addPantryItem}
              onRemove={removePantryItem}
              isSelected={isSelected}
              onToggleSelected={toggleSelected}
              allSelected={allSelected}
              onToggleSelectAll={toggleSelectAll}
            />
            <PantryAnalyticsPanel
              recipes={recipes}
              pantryItemCount={pantryItems.length}
              locked={!showPantryAnalytics}
            />
          </>
        )}

        {activeTab === "generate" && (
          <GenerateTab
            selectedItems={selectedItems}
            onDeselect={toggleSelected}
            totalCount={pantryItems.length}
            customInstructions={customInstructions}
            onCustomInstructionsChange={setCustomInstructions}
            pantryOnly={pantryOnly}
            onPantryOnlyChange={setPantryOnly}
            recipeCount={recipeCount}
            onRecipeCountChange={setRecipeCount}
            onGenerate={handleGenerate}
            onSuggestForMe={handleSuggestForMe}
            generating={generating}
            generateError={generateError}
            tierId={tierId}
            remaining={remaining}
            generationsPerWeek={generationsPerWeek}
            initialDietaryPreferences={initialDietaryPreferences}
            initialDietaryNotes={initialDietaryNotes}
          />
        )}

        {activeTab === "search" && (
          <SearchTab
            selectedNames={selectedNames}
            totalPantryCount={pantryItems.length}
            tierId={tierId}
            remaining={searchesRemaining}
            webSearchesPerWeek={webSearchesPerWeek}
            onSearchUsed={() => setSearchesUsed((prev) => prev + 1)}
          />
        )}

        {activeTab === "recipes" && (
          <RecipeGrid
            recipes={recipes}
            showNutrition={showNutrition}
            multiDayAllowed={multiDayAllowed}
            onAddToShoppingList={addNeedIngredientsToShoppingList}
            onAddToMealPlan={addToMealPlan}
            onToggleShare={toggleShare}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteRecipe}
          />
        )}

        {activeTab === "shopping" && (
          <div className="mx-auto max-w-md">
            <ShoppingList
              items={shoppingList}
              onAdd={addShoppingItem}
              onToggle={toggleShoppingItem}
              onRemove={removeShoppingItem}
              onClearChecked={clearCheckedShoppingItems}
            />
          </div>
        )}

        {activeTab === "schedule" && (
          <MealPlanner
            weekStartDate={weekStartDate}
            entries={mealPlan}
            onPrevWeek={() => goToWeek(-1)}
            onNextWeek={() => goToWeek(1)}
            onRemoveEntry={removeMealPlanEntry}
            onShopForWeek={shopForWeek}
            onPlanWeek={handlePlanWeek}
            planWeekAllowed={bulkMealPrepAllowed}
            planningWeek={planningWeek}
          />
        )}

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </main>
    </>
  );
}
