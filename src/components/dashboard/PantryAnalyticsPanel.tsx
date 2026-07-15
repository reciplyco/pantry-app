"use client";

import Link from "next/link";
import type { Recipe } from "@/lib/types";

type Props = {
  recipes: Recipe[];
  pantryItemCount: number;
  locked: boolean;
};

function topIngredients(
  recipes: Recipe[],
  count: number
): { name: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const recipe of recipes) {
    for (const name of recipe.have_ingredients) {
      const key = name.trim().toLowerCase();
      if (!key) continue;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }
  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([name, ingredientCount]) => ({ name, count: ingredientCount }));
}

export default function PantryAnalyticsPanel({
  recipes,
  pantryItemCount,
  locked,
}: Props) {
  if (locked) {
    return (
      <div className="mt-8 paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Pantry analytics</h2>
        <p className="mt-1 text-sm text-ink-muted">
          See your most-used ingredients, average cook time, and recipe
          stats at a glance.
        </p>
        <Link
          href="/app/billing"
          className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
        >
          Upgrade to Pro →
        </Link>
      </div>
    );
  }

  const timedRecipes = recipes.filter((r) => r.time_minutes != null);
  const avgTime =
    timedRecipes.length > 0
      ? Math.round(
          timedRecipes.reduce((sum, r) => sum + (r.time_minutes ?? 0), 0) /
            timedRecipes.length
        )
      : null;
  const favoritesCount = recipes.filter((r) => r.is_favorite).length;
  const readyToCookCount = recipes.filter(
    (r) => r.need_ingredients.length === 0
  ).length;
  const ingredients = topIngredients(recipes, 5);

  const stats: { label: string; value: string | number }[] = [
    { label: "Pantry items", value: pantryItemCount },
    { label: "Recipes generated", value: recipes.length },
    { label: "Favorites", value: favoritesCount },
    { label: "Ready to cook now", value: readyToCookCount },
    { label: "Avg. cook time", value: avgTime != null ? `${avgTime} min` : "—" },
  ];

  return (
    <section className="mt-8 paper-card rounded-sm p-6">
      <h2 className="font-serif text-xl font-medium">Pantry analytics</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-sm border border-line bg-paper-alt p-3"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-medium text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {ingredients.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Most-used ingredients
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ingredients.map((ing) => (
              <li
                key={ing.name}
                className="rounded-full border border-line bg-paper-alt px-3 py-1.5 text-sm text-ink"
              >
                {ing.name} <span className="text-ink-muted">×{ing.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
