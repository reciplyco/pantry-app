"use client";

import Link from "next/link";
import { getIngredientIcon } from "@/lib/ingredient-icons";
import DietaryPreferencesPanel from "./DietaryPreferencesPanel";

const MAX_INSTRUCTIONS_LENGTH = 100;

type Props = {
  selectedNames: string[];
  totalCount: number;
  customInstructions: string;
  onCustomInstructionsChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  generating: boolean;
  generateError: string | null;
  isPro: boolean;
  remaining: number;
  freeTierWeeklyLimit: number;
  initialDietaryPreferences: string[];
  initialDietaryNotes: string;
};

export default function GenerateTab({
  selectedNames,
  totalCount,
  customInstructions,
  onCustomInstructionsChange,
  onGenerate,
  generating,
  generateError,
  isPro,
  remaining,
  freeTierWeeklyLimit,
  initialDietaryPreferences,
  initialDietaryNotes,
}: Props) {
  const isCapped = !isPro && remaining <= 0;
  const hasSelection = selectedNames.length > 0;

  return (
    <div className="flex min-h-[65vh] flex-col justify-center">
      <div className="mb-8 text-center">
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
              : `Using ${selectedNames.length} of ${totalCount} pantry item${totalCount === 1 ? "" : "s"}`}
          </p>
          <div className="shrink-0 font-mono text-xs text-ink-muted">
            {isPro ? (
              <span className="text-sage">Unlimited generations</span>
            ) : (
              <span className={isCapped ? "text-accent" : undefined}>
                {remaining} / {freeTierWeeklyLimit} free generations left this
                week
              </span>
            )}
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
            ) : (
              "Generate recipes"
            )}
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-center">
            {isCapped && (
              <Link
                href="/app/billing"
                className="text-sm font-medium text-accent underline underline-offset-2"
              >
                Upgrade to Pro for unlimited recipes →
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
