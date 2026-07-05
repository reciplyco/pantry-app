"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIngredientIcon } from "@/lib/ingredient-icons";

type ShowcaseRecipe = {
  title: string;
  timeMinutes: number;
  servings: number;
  calories: number;
  haveIngredients: string[];
  needIngredients: string[];
};

const PANTRY_ITEMS = ["chickpeas", "spinach", "garlic", "rice", "lemon"];

const EXAMPLE_RECIPES: ShowcaseRecipe[] = [
  {
    title: "Lemony Chickpea & Spinach Rice",
    timeMinutes: 25,
    servings: 2,
    calories: 410,
    haveIngredients: ["chickpeas", "spinach", "garlic", "rice", "lemon"],
    needIngredients: [],
  },
  {
    title: "Garlicky Chickpea Rice Bowl",
    timeMinutes: 20,
    servings: 2,
    calories: 385,
    haveIngredients: ["chickpeas", "rice", "garlic"],
    needIngredients: ["olive oil", "cumin"],
  },
  {
    title: "Spinach & Rice Skillet with Lemon Zest",
    timeMinutes: 30,
    servings: 3,
    calories: 360,
    haveIngredients: ["spinach", "rice", "lemon", "garlic"],
    needIngredients: ["parmesan"],
  },
];

// Cycled by grid position, same trick as the real RecipeCard, so
// neighboring example cards don't share the same banner wash.
const BANNER_WASHES = ["bg-accent/10", "bg-sage/10", "bg-paper-alt"];

function ShowcaseRecipeCard({
  recipe,
  index,
}: {
  recipe: ShowcaseRecipe;
  index: number;
}) {
  const bannerWash = BANNER_WASHES[index % BANNER_WASHES.length];
  return (
    <article
      className="paper-card anim-fade-in-up flex flex-col overflow-hidden rounded-sm"
      style={{ "--anim-delay": `${index * 0.15}s` } as React.CSSProperties}
    >
      <div
        className={`flex h-20 items-center justify-center text-4xl ${bannerWash}`}
        aria-hidden="true"
      >
        {getIngredientIcon(recipe.haveIngredients[0])}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl font-medium leading-snug">
          {recipe.title}
        </h3>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {recipe.timeMinutes} min · {recipe.servings} servings
        </p>
        <p className="mt-2 font-mono text-xs text-ink-muted">
          {recipe.calories} cal
        </p>

        <div className="my-3 border-t border-dashed border-line" />

        <div className="text-sm">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            From your pantry
          </p>
          <p className="mt-1 text-ink">{recipe.haveIngredients.join(", ")}</p>
        </div>

        {recipe.needIngredients.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="text-xs uppercase tracking-widest text-ink-muted">
              You&rsquo;ll need
            </p>
            <p className="mt-1 text-ink">{recipe.needIngredients.join(", ")}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function GenerateShowcase() {
  const [showRecipes, setShowRecipes] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRecipes(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          See it work
        </p>
        <h2 className="mt-2 font-serif text-3xl font-medium">
          Tell us what&rsquo;s in your kitchen. We&rsquo;ll tell you what to
          cook.
        </h2>
      </div>

      <div className="paper-card mx-auto mt-8 max-w-md rounded-sm p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Tonight&rsquo;s pantry
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {PANTRY_ITEMS.map((name, index) => (
            <li
              key={name}
              className="anim-fade-in-up flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink"
              style={{ "--anim-delay": `${index * 0.08}s` } as React.CSSProperties}
            >
              <span aria-hidden="true">{getIngredientIcon(name)}</span>
              {name}
            </li>
          ))}
        </ul>
      </div>

      {showRecipes && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {EXAMPLE_RECIPES.map((recipe, index) => (
              <ShowcaseRecipeCard key={recipe.title} recipe={recipe} index={index} />
            ))}
          </div>
          <p className="anim-fade-in mt-8 text-center text-ink-muted">
            That&rsquo;s it — real recipes from what&rsquo;s already in your
            kitchen.{" "}
            <Link
              href="/login?tab=signup"
              className="font-medium text-accent underline underline-offset-2"
            >
              Try it free →
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
