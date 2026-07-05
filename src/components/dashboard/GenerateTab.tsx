"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getIngredientIcon } from "@/lib/ingredient-icons";
import { getTier } from "@/lib/pricing";
import type { PantryItem, SubscriptionTier } from "@/lib/types";
import DietaryPreferencesPanel from "./DietaryPreferencesPanel";

const MAX_INSTRUCTIONS_LENGTH = 100;

type Props = {
  selectedItems: PantryItem[];
  onDeselect: (id: string) => void;
  totalCount: number;
  customInstructions: string;
  onCustomInstructionsChange: (value: string) => void;
  pantryOnly: boolean;
  onPantryOnlyChange: (value: boolean) => void;
  recipeCount: 1 | 5;
  onRecipeCountChange: (value: 1 | 5) => void;
  onGenerate: () => Promise<void>;
  generating: boolean;
  generateError: string | null;
  tierId: SubscriptionTier;
  remaining: number;
  generationsPerMonth: number;
  initialDietaryPreferences: string[];
  initialDietaryNotes: string;
};

export default function GenerateTab({
  selectedItems,
  onDeselect,
  totalCount,
  customInstructions,
  onCustomInstructionsChange,
  pantryOnly,
  onPantryOnlyChange,
  recipeCount,
  onRecipeCountChange,
  onGenerate,
  generating,
  generateError,
  tierId,
  remaining,
  generationsPerMonth,
  initialDietaryPreferences,
  initialDietaryNotes,
}: Props) {
  const isCapped = remaining <= 0;
  const isTopTier = getTier(tierId).id === "ultimate";
  const hasSelection = selectedItems.length > 0;
  const canPickFive = remaining >= 5;

  // The 5-recipe option can become unavailable out from under the user
  // (e.g. they just spent their last few generations) — fall back to 1
  // rather than leaving an unusable option selected.
  useEffect(() => {
    if (recipeCount === 5 && !canPickFive) {
      onRecipeCountChange(1);
    }
  }, [recipeCount, canPickFive, onRecipeCountChange]);

  return (
    <div className="flex min-h-[65vh] flex-col justify-center">
      <div className="mb-8 text-center">
        <p
          className="mb-3 flex justify-center gap-4 text-2xl opacity-80 sm:text-3xl"
          aria-hidden="true"
        >
          <span className="-rotate-6">🍅</span>
          <span className="rotate-3">🌿</span>
          <span className="-rotate-3">🥕</span>
          <span className="rotate-6">🧄</span>
          <span className="-rotate-3">🍋</span>
        </p>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Cook what you already have
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium leading-tight sm:text-5xl">
          What should we cook tonight?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          Pick from your pantry, tell us what you&rsquo;re in the mood for,
          and we&rsquo;ll turn it into real recipes in seconds.
        </p>
      </div>

      <div className="paper-card rounded-sm p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            {totalCount === 0
              ? "No pantry items yet"
              : `Using ${selectedItems.length} of ${totalCount} pantry item${totalCount === 1 ? "" : "s"}`}
          </p>
          <div className="shrink-0 font-mono text-xs text-ink-muted">
            <span className={isCapped ? "text-accent" : undefined}>
              {remaining} / {generationsPerMonth} generations left this month
            </span>
          </div>
        </div>

        {totalCount === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Add some pantry items first, over on the Pantry tab.
          </p>
        ) : !hasSelection ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nothing selected — check off items on the Pantry tab first.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-1.5 rounded-full border border-line bg-paper-alt py-1.5 pl-3 pr-1.5 text-sm text-ink"
              >
                <span aria-hidden="true">{getIngredientIcon(item.name)}</span>
                {item.name}
                <button
                  type="button"
                  onClick={() => onDeselect(item.id)}
                  aria-label={`Remove "${item.name}" from this generation`}
                  className="flex h-4 w-4 items-center justify-center rounded-full leading-none text-ink-muted transition hover:bg-line hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <label
            htmlFor="custom-instructions"
            className="mb-1 block text-sm text-ink-muted"
          >
            Custom instructions (optional)
          </label>
          <input
            id="custom-instructions"
            type="text"
            value={customInstructions}
            onChange={(e) =>
              onCustomInstructionsChange(
                e.target.value.slice(0, MAX_INSTRUCTIONS_LENGTH)
              )
            }
            maxLength={MAX_INSTRUCTIONS_LENGTH}
            placeholder="e.g. quick weeknight dinner, kid-friendly, spicy"
            className="w-full rounded-sm border border-line bg-card px-4 py-3 text-base outline-none focus:border-accent"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-muted">
            {customInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
          </p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={pantryOnly}
            onChange={(e) => onPantryOnlyChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
          />
          <span>
            Only use what&rsquo;s in my pantry
            <span className="block text-xs text-ink-muted">
              No extra ingredients, not even basic staples — recipes will be
              buildable from your selected items alone.
            </span>
          </span>
        </label>

        <div className="mt-6">
          <p className="mb-2 text-sm text-ink-muted">How many recipes?</p>
          <div className="inline-flex rounded-full border border-line p-1">
            <button
              type="button"
              onClick={() => onRecipeCountChange(1)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                recipeCount === 1
                  ? "bg-accent text-accent-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              1 recipe
            </button>
            <button
              type="button"
              onClick={() => onRecipeCountChange(5)}
              disabled={!canPickFive}
              title={
                canPickFive
                  ? undefined
                  : "Need 5 generations left this month to pick this"
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                recipeCount === 5
                  ? "bg-accent text-accent-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              5 recipes
            </button>
          </div>
          {recipeCount === 5 && (
            <p className="mt-1.5 text-xs text-ink-muted">
              Uses 5 of your generations at once.
            </p>
          )}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || isCapped || !hasSelection}
            className="w-full rounded-full bg-accent px-6 py-4 text-lg font-medium text-accent-ink transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50"
          >
            {generating ? (
              <span className="inline-flex items-center gap-1.5">
                Cooking up ideas
                <span className="inline-flex gap-0.5">
                  <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
                  <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
                  <span className="anim-bounce-dot h-1.5 w-1.5 rounded-full bg-accent-ink" />
                </span>
              </span>
            ) : recipeCount === 5 ? (
              "Generate 5 recipes"
            ) : (
              "Generate recipe"
            )}
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-center">
            {isCapped && !isTopTier && (
              <Link
                href="/app/billing"
                className="text-sm font-medium text-accent underline underline-offset-2"
              >
                Upgrade for more recipe generations →
              </Link>
            )}
            {generateError && !isCapped && (
              <p className="text-sm text-accent">{generateError}</p>
            )}
          </div>
          {isCapped && generateError && (
            <p className="mt-1 text-center text-sm text-ink-muted">
              {generateError}
            </p>
          )}
        </div>
      </div>

      <DietaryPreferencesPanel
        initialPreferences={initialDietaryPreferences}
        initialNotes={initialDietaryNotes}
      />
    </div>
  );
}
