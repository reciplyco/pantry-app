"use client";

import Link from "next/link";

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
}: Props) {
  const isCapped = !isPro && remaining <= 0;
  const hasSelection = selectedNames.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">
            {totalCount === 0
              ? "Add some pantry items first, over on the Pantry tab."
              : hasSelection
                ? `Using ${selectedNames.length} of ${totalCount} pantry item${totalCount === 1 ? "" : "s"}: ${selectedNames.join(", ")}`
                : "Nothing selected — check off items on the Pantry tab first."}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-xs text-ink-muted">
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

      <div className="mt-5">
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
          className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        />
        <p className="mt-1 text-right font-mono text-xs text-ink-muted">
          {customInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || isCapped || !hasSelection}
          className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50"
        >
          {generating ? (
            <span className="inline-flex items-center gap-1">
              Cooking up ideas
              <span className="inline-flex gap-0.5">
                <span className="anim-bounce-dot h-1 w-1 rounded-full bg-accent-ink" />
                <span className="anim-bounce-dot h-1 w-1 rounded-full bg-accent-ink" />
                <span className="anim-bounce-dot h-1 w-1 rounded-full bg-accent-ink" />
              </span>
            </span>
          ) : (
            "Generate recipes"
          )}
        </button>
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
        <p className="mt-2 text-sm text-ink-muted">{generateError}</p>
      )}
    </div>
  );
}
