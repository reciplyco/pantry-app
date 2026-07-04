"use client";

import { useMemo, useState } from "react";
import type { SearchRecipeResult, SearchSort } from "@/lib/types";
import {
  SEARCH_CUISINE_OPTIONS,
  SEARCH_DIET_OPTIONS,
  SEARCH_METHOD_OPTIONS,
  SEARCH_TIME_OPTIONS,
} from "@/lib/types";
import { getIngredientIcon } from "@/lib/ingredient-icons";
import { AnalyticsEvent, track } from "@/lib/analytics";
import SearchRecipeCard from "./SearchRecipeCard";

type Props = {
  selectedNames: string[];
  totalPantryCount: number;
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function sortResults(
  results: SearchRecipeResult[],
  sort: SearchSort
): SearchRecipeResult[] {
  const copy = [...results];
  if (sort === "time") {
    copy.sort((a, b) => {
      if (a.readyInMinutes == null) return 1;
      if (b.readyInMinutes == null) return -1;
      return a.readyInMinutes - b.readyInMinutes;
    });
  } else if (sort === "popularity") {
    copy.sort((a, b) => b.popularity - a.popularity);
  } else {
    copy.sort((a, b) => b.matchPercent - a.matchPercent);
  }
  return copy;
}

export default function SearchTab({ selectedNames, totalPantryCount }: Props) {
  const [manualInput, setManualInput] = useState("");
  const [manualIngredients, setManualIngredients] = useState<string[]>([]);
  const [maxTime, setMaxTime] = useState<number | undefined>(undefined);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [diets, setDiets] = useState<string[]>([]);
  const [sort, setSort] = useState<SearchSort>("match");
  const [results, setResults] = useState<SearchRecipeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const combinedIngredients = useMemo(() => {
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const name of [...selectedNames, ...manualIngredients]) {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(name.trim());
    }
    return combined.slice(0, 40);
  }, [selectedNames, manualIngredients]);

  const sortedResults = useMemo(
    () => sortResults(results, sort),
    [results, sort]
  );

  function addManualIngredient(e: React.FormEvent) {
    e.preventDefault();
    const value = manualInput.trim();
    if (!value) return;
    setManualIngredients((prev) => [...prev, value]);
    setManualInput("");
  }

  function removeManualIngredient(name: string) {
    setManualIngredients((prev) => prev.filter((n) => n !== name));
  }

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: combinedIngredients,
          maxTime,
          cuisines,
          methods,
          diets,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        setResults([]);
      } else {
        const found = body.results as SearchRecipeResult[];
        setResults(found);
        track(AnalyticsEvent.RecipeSearchPerformed, {
          resultCount: found.length,
          ingredientCount: combinedIngredients.length,
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  function handleViewRecipe(recipe: SearchRecipeResult) {
    track(AnalyticsEvent.ExternalRecipeViewed, {
      sourceName: recipe.sourceName,
      matchPercent: recipe.matchPercent,
    });
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">
        Search the web for recipes that use what you&rsquo;ve got. Results
        link out to the original recipe site — nothing here is AI-generated.
      </p>

      <div className="mt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Ingredients
        </p>
        {selectedNames.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {selectedNames.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1.5 rounded-full border border-line bg-paper-alt px-3 py-1.5 text-sm text-ink"
              >
                <span aria-hidden="true">{getIngredientIcon(name)}</span>
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">
            {totalPantryCount === 0
              ? "Nothing selected from your pantry — add ingredients below, or head to the Pantry tab."
              : "Nothing selected from your pantry — check off items on the Pantry tab, or add ingredients below."}
          </p>
        )}

        <form onSubmit={addManualIngredient} className="mt-3 flex gap-3">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Add another ingredient to search with"
            maxLength={80}
            className="flex-1 rounded-sm border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium transition hover:border-ink active:scale-95"
          >
            Add
          </button>
        </form>
        {manualIngredients.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {manualIngredients.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-ink"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeManualIngredient(name)}
                  aria-label={`Remove ${name}`}
                  className="text-ink-muted transition hover:text-accent"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Time
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMaxTime(undefined)}
              className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                maxTime === undefined
                  ? "border-accent bg-card text-ink"
                  : "border-line text-ink-muted hover:text-ink"
              }`}
            >
              Any
            </button>
            {SEARCH_TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMaxTime(t)}
                className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                  maxTime === t
                    ? "border-accent bg-card text-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                Under {t} min
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Cuisine
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEARCH_CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCuisines((prev) => toggleInList(prev, c))}
                className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                  cuisines.includes(c)
                    ? "border-accent bg-card text-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Cooking method
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEARCH_METHOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethods((prev) => toggleInList(prev, m.value))}
                className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                  methods.includes(m.value)
                    ? "border-accent bg-card text-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Dietary
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEARCH_DIET_OPTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDiets((prev) => toggleInList(prev, d.value))}
                className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                  diets.includes(d.value)
                    ? "border-accent bg-card text-ink"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-accent px-6 py-4 text-lg font-medium text-accent-ink transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            Searching the web
            <span className="inline-flex gap-0.5">
              <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
              <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
              <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
            </span>
          </span>
        ) : (
          "Search recipes"
        )}
      </button>
      {error && <p className="mt-2 text-center text-sm text-accent">{error}</p>}

      {hasSearched && !error && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-medium">
              {results.length} recipe{results.length === 1 ? "" : "s"} found
            </h2>
            {results.length > 0 && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SearchSort)}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
              >
                <option value="match">Sort: Best match</option>
                <option value="time">Sort: Quickest</option>
                <option value="popularity">Sort: Most popular</option>
              </select>
            )}
          </div>

          {results.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No recipes matched — try loosening a filter or adding more
              ingredients.
            </p>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedResults.map((recipe, index) => (
                <SearchRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={index}
                  onViewRecipe={handleViewRecipe}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
