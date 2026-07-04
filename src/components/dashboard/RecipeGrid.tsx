"use client";

import { useMemo, useState } from "react";
import type { Day, Recipe } from "@/lib/types";
import RecipeCard from "./RecipeCard";

type Props = {
  recipes: Recipe[];
  onAddToShoppingList: (recipe: Recipe) => Promise<void>;
  onAddToMealPlan: (recipeId: string, day: Day) => Promise<void>;
  onToggleShare: (recipe: Recipe) => Promise<void>;
  onToggleFavorite: (recipe: Recipe) => Promise<void>;
};

type SortBy = "newest" | "time" | "calories";

function matchesQuery(recipe: Recipe, query: string) {
  const haystack = [
    recipe.title,
    ...recipe.have_ingredients,
    ...recipe.need_ingredients.map((i) => i.name),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function RecipeGrid({
  recipes,
  onAddToShoppingList,
  onAddToMealPlan,
  onToggleShare,
  onToggleFavorite,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [readyToCookOnly, setReadyToCookOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const visibleRecipes = useMemo(() => {
    let result = recipes;

    if (query.trim()) {
      result = result.filter((r) => matchesQuery(r, query.trim()));
    }
    if (readyToCookOnly) {
      result = result.filter((r) => r.need_ingredients.length === 0);
    }
    if (favoritesOnly) {
      result = result.filter((r) => r.is_favorite);
    }

    if (sortBy === "time") {
      result = [...result].sort(
        (a, b) => (a.time_minutes ?? Infinity) - (b.time_minutes ?? Infinity)
      );
    } else if (sortBy === "calories") {
      result = [...result].sort(
        (a, b) =>
          (a.nutrition?.calories ?? Infinity) -
          (b.nutrition?.calories ?? Infinity)
      );
    }
    // "newest" is already the incoming order (created_at desc from the server).

    return result;
  }, [recipes, query, sortBy, readyToCookOnly, favoritesOnly]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-medium">Recipes</h2>
        {recipes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes or ingredients"
              className="w-56 rounded-full border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="newest">Newest</option>
              <option value="time">Quickest</option>
              <option value="calories">Lowest calorie</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={readyToCookOnly}
                onChange={(e) => setReadyToCookOnly(e.target.checked)}
                className="accent-accent"
              />
              Ready to cook now
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
                className="accent-accent"
              />
              Favorites
            </label>
          </div>
        )}
      </div>

      {recipes.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No recipes yet — add pantry items above and generate some.
        </p>
      ) : visibleRecipes.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No recipes match your search or filters.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRecipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              index={index}
              onAddToShoppingList={onAddToShoppingList}
              onAddToMealPlan={onAddToMealPlan}
              onToggleShare={onToggleShare}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}
