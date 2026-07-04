"use client";

import { useState } from "react";
import Image from "next/image";
import type { SearchRecipeResult } from "@/lib/types";

type Props = {
  recipe: SearchRecipeResult;
  index?: number;
  onViewRecipe: (recipe: SearchRecipeResult) => void;
};

export default function SearchRecipeCard({
  recipe,
  index = 0,
  onViewRecipe,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const tags = [...recipe.cuisines, ...recipe.diets].slice(0, 4);
  const showImage = Boolean(recipe.image) && !imageFailed;

  return (
    <article
      className="paper-card anim-fade-in-up flex flex-col overflow-hidden rounded-sm"
      style={{ "--anim-delay": `${Math.min(index, 8) * 0.06}s` } as React.CSSProperties}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-paper-alt">
        {showImage ? (
          <Image
            src={recipe.image as string}
            alt={recipe.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl"
            aria-hidden="true"
          >
            🍽️
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 font-mono text-xs font-medium shadow-sm ${
            recipe.matchPercent >= 70
              ? "bg-sage text-sage-ink"
              : recipe.matchPercent >= 40
                ? "bg-accent text-accent-ink"
                : "bg-card text-ink-muted"
          }`}
        >
          {recipe.matchPercent}% match
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl font-medium leading-snug">
          {recipe.title}
        </h3>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {recipe.sourceName ?? "Unknown source"}
          {recipe.readyInMinutes ? ` · ${recipe.readyInMinutes} min` : ""}
        </p>

        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-2.5 py-0.5 text-xs capitalize text-ink-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="my-3 border-t border-dashed border-line" />

        {recipe.matchedIngredients.length > 0 && (
          <div className="text-sm">
            <p className="text-xs uppercase tracking-widest text-ink-muted">
              From your pantry
            </p>
            <p className="mt-1 text-ink">
              {recipe.matchedIngredients.join(", ")}
            </p>
          </div>
        )}

        {recipe.missingIngredients.length > 0 ? (
          <div className="mt-3 text-sm">
            <p className="text-xs uppercase tracking-widest text-ink-muted">
              You&rsquo;ll need
            </p>
            <p className="mt-1 text-ink">
              {recipe.missingIngredients.join(", ")}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-sage">
            You have everything for this one
          </p>
        )}

        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onViewRecipe(recipe)}
          className="mt-4 block rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium transition hover:border-ink active:scale-95"
        >
          View full recipe →
        </a>
      </div>
    </article>
  );
}
