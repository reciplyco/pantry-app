"use client";

import { useState } from "react";
import { DAYS, DAY_LABELS, stripStepNumber, type Day, type Recipe } from "@/lib/types";

type Props = {
  recipe: Recipe;
  index?: number;
  onAddToShoppingList: (recipe: Recipe) => Promise<void>;
  onAddToMealPlan: (recipeId: string, day: Day) => Promise<void>;
  onToggleShare: (recipe: Recipe) => Promise<void>;
  onToggleFavorite: (recipe: Recipe) => Promise<void>;
  onDelete: (recipe: Recipe) => Promise<void>;
};

export default function RecipeCard({
  recipe,
  index = 0,
  onAddToShoppingList,
  onAddToMealPlan,
  onToggleShare,
  onToggleFavorite,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [day, setDay] = useState<Day>("mon");
  const [addingToList, setAddingToList] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [pop, setPop] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(recipe);
  }

  async function handleToggleFavorite() {
    setPop(true);
    setTimeout(() => setPop(false), 350);
    setFavoriting(true);
    await onToggleFavorite(recipe);
    setFavoriting(false);
  }

  const shareUrl =
    recipe.share_token && typeof window !== "undefined"
      ? `${window.location.origin}/r/${recipe.share_token}`
      : null;

  async function handleToggleShare() {
    setSharing(true);
    await onToggleShare(recipe);
    setSharing(false);
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article
      className="paper-card anim-fade-in-up flex flex-col rounded-sm p-5"
      style={{ "--anim-delay": `${Math.min(index, 8) * 0.06}s` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-xl font-medium leading-snug">
          {recipe.title}
        </h3>
        <button
          type="button"
          disabled={favoriting}
          onClick={handleToggleFavorite}
          aria-label={
            recipe.is_favorite ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={recipe.is_favorite}
          className={`shrink-0 text-xl leading-none transition disabled:opacity-50 ${pop ? "anim-pop" : ""} ${
            recipe.is_favorite
              ? "text-accent"
              : "text-line hover:text-ink-muted"
          }`}
        >
          {recipe.is_favorite ? "★" : "☆"}
        </button>
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        {recipe.time_minutes ? `${recipe.time_minutes} min` : null}
        {recipe.time_minutes && recipe.servings ? " · " : null}
        {recipe.servings ? `${recipe.servings} servings` : null}
      </p>

      {recipe.nutrition && (
        <p className="mt-2 font-mono text-xs text-ink-muted">
          {Math.round(recipe.nutrition.calories)} cal ·{" "}
          {Math.round(recipe.nutrition.protein_g)}g protein ·{" "}
          {Math.round(recipe.nutrition.carbs_g)}g carbs ·{" "}
          {Math.round(recipe.nutrition.fat_g)}g fat
        </p>
      )}

      <div className="my-3 border-t border-dashed border-line" />

      {recipe.have_ingredients?.length > 0 && (
        <div className="text-sm">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            From your pantry
          </p>
          <p className="mt-1 text-ink">{recipe.have_ingredients.join(", ")}</p>
        </div>
      )}

      {recipe.need_ingredients?.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            You&rsquo;ll need
          </p>
          <p className="mt-1 text-ink">
            {recipe.need_ingredients
              .map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name))
              .join(", ")}
          </p>
        </div>
      )}

      {recipe.steps?.length > 0 && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-ink">
              {recipe.steps.map((step, i) => (
                <li key={i}>{stripStepNumber(step)}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-accent underline underline-offset-2 transition active:scale-95"
          >
            {expanded ? "Hide recipe" : "View recipe"}
          </button>
          <button
            type="button"
            disabled={sharing}
            onClick={handleToggleShare}
            className="text-sm text-ink-muted underline underline-offset-2 transition hover:text-ink active:scale-95 disabled:opacity-50"
          >
            {sharing
              ? "…"
              : recipe.share_token
                ? "Stop sharing"
                : "Share"}
          </button>
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          aria-label={`Delete "${recipe.title}"`}
          className="text-sm text-ink-muted underline underline-offset-2 transition hover:text-accent active:scale-95 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {shareUrl && (
        <div className="anim-fade-in mt-2 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-sm border border-line bg-paper-alt px-2 py-1 font-mono text-xs text-ink-muted outline-none"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium transition hover:border-ink active:scale-95"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
        <button
          type="button"
          disabled={addingToList || recipe.need_ingredients?.length === 0}
          onClick={async () => {
            setAddingToList(true);
            await onAddToShoppingList(recipe);
            setAddingToList(false);
          }}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {addingToList ? "Adding…" : "Add missing to shopping list"}
        </button>

        <div className="flex items-center gap-2">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as Day)}
            className="rounded-sm border border-line bg-card px-2 py-2 text-sm outline-none focus:border-accent"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={addingToPlan}
            onClick={async () => {
              setAddingToPlan(true);
              await onAddToMealPlan(recipe.id, day);
              setAddingToPlan(false);
            }}
            className="flex-1 rounded-full bg-sage px-4 py-2 text-sm font-medium text-sage-ink transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50"
          >
            {addingToPlan ? "Adding…" : "Add to plan"}
          </button>
        </div>
      </div>
    </article>
  );
}
