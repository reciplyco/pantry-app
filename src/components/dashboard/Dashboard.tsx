"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, toDateKey } from "@/lib/dates";
import type {
  Day,
  MealPlanEntryWithRecipe,
  PantryItem,
  Recipe,
  ShoppingListItem,
  SubscriptionStatus,
} from "@/lib/types";
import PantryPanel from "./PantryPanel";
import RecipeGrid from "./RecipeGrid";
import ShoppingList from "./ShoppingList";
import MealPlanner from "./MealPlanner";

type Props = {
  initialPantryItems: PantryItem[];
  initialRecipes: Recipe[];
  initialShoppingList: ShoppingListItem[];
  initialMealPlan: MealPlanEntryWithRecipe[];
  initialWeekStartDate: string;
  subscriptionStatus: SubscriptionStatus;
  generationsUsedThisWeek: number;
  freeTierWeeklyLimit: number;
};

export default function Dashboard({
  initialPantryItems,
  initialRecipes,
  initialShoppingList,
  initialMealPlan,
  initialWeekStartDate,
  subscriptionStatus,
  generationsUsedThisWeek,
  freeTierWeeklyLimit,
}: Props) {
  const supabase = createClient();

  const [pantryItems, setPantryItems] = useState(initialPantryItems);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [shoppingList, setShoppingList] = useState(initialShoppingList);
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [weekStartDate, setWeekStartDate] = useState(initialWeekStartDate);
  const [usedThisWeek, setUsedThisWeek] = useState(generationsUsedThisWeek);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isPro = subscriptionStatus === "active";
  const remaining = Math.max(0, freeTierWeeklyLimit - usedThisWeek);

  async function addPantryItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("pantry_items")
      .insert({ name: trimmed })
      .select("*")
      .single<PantryItem>();
    if (!error && data) setPantryItems((prev) => [...prev, data]);
  }

  async function removePantryItem(id: string) {
    setPantryItems((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("pantry_items").delete().eq("id", id);
  }

  async function handleGenerate() {
    if (pantryItems.length === 0) {
      setGenerateError("Add a few pantry items first.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pantryItems: pantryItems.map((p) => p.name) }),
      });
      const body = await res.json();
      if (!res.ok) {
        setGenerateError(body.message ?? body.error ?? "Something went wrong.");
        return;
      }
      setRecipes((prev) => [...(body.recipes as Recipe[]), ...prev]);
      setUsedThisWeek((prev) => prev + 1);
    } catch {
      setGenerateError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
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
    if (!error && data) setShoppingList((prev) => [...prev, data]);
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
    if (toInsert.length === 0) return;
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert(toInsert)
      .select("*")
      .returns<ShoppingListItem[]>();
    if (!error && data) setShoppingList((prev) => [...prev, ...data]);
  }

  async function toggleShoppingItem(id: string, checked: boolean) {
    setShoppingList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked } : i))
    );
    await supabase.from("shopping_list_items").update({ checked }).eq("id", id);
  }

  async function removeShoppingItem(id: string) {
    setShoppingList((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_list_items").delete().eq("id", id);
  }

  async function clearCheckedShoppingItems() {
    const ids = shoppingList.filter((i) => i.checked).map((i) => i.id);
    if (ids.length === 0) return;
    setShoppingList((prev) => prev.filter((i) => !i.checked));
    await supabase.from("shopping_list_items").delete().in("id", ids);
  }

  async function loadWeek(newWeekStartDate: string) {
    const { data } = await supabase
      .from("meal_plan_entries")
      .select("*, recipe:recipes(id,title,time_minutes,servings)")
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
      .select("*, recipe:recipes(id,title,time_minutes,servings)")
      .single<MealPlanEntryWithRecipe>();
    if (!error && data) setMealPlan((prev) => [...prev, data]);
  }

  async function removeMealPlanEntry(id: string) {
    setMealPlan((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("meal_plan_entries").delete().eq("id", id);
  }

  return (
    <div className="space-y-10">
      <PantryPanel
        pantryItems={pantryItems}
        onAdd={addPantryItem}
        onRemove={removePantryItem}
        onGenerate={handleGenerate}
        generating={generating}
        generateError={generateError}
        isPro={isPro}
        remaining={remaining}
        freeTierWeeklyLimit={freeTierWeeklyLimit}
      />

      <RecipeGrid
        recipes={recipes}
        onAddToShoppingList={addNeedIngredientsToShoppingList}
        onAddToMealPlan={addToMealPlan}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_2fr]">
        <ShoppingList
          items={shoppingList}
          onAdd={addShoppingItem}
          onToggle={toggleShoppingItem}
          onRemove={removeShoppingItem}
          onClearChecked={clearCheckedShoppingItems}
        />
        <MealPlanner
          weekStartDate={weekStartDate}
          entries={mealPlan}
          onPrevWeek={() => goToWeek(-1)}
          onNextWeek={() => goToWeek(1)}
          onRemoveEntry={removeMealPlanEntry}
        />
      </div>
    </div>
  );
}
