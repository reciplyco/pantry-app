import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripStepNumber, type Recipe } from "@/lib/types";

type Params = { token: string };

export default async function SharedRecipePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("share_token", token)
    .single<Recipe>();

  if (!recipe) {
    notFound();
  }

  const ingredients = [
    ...recipe.have_ingredients.map((name) => ({ name, quantity: null as string | null })),
    ...recipe.need_ingredients,
  ];

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 font-serif text-2xl font-medium tracking-tight"
      >
        Reciply
      </Link>

      <article className="paper-card w-full max-w-lg rounded-sm p-8">
        <h1 className="font-serif text-3xl font-medium leading-snug">
          {recipe.title}
        </h1>
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

        <div className="my-4 border-t border-dashed border-line" />

        {ingredients.length > 0 && (
          <div className="text-sm">
            <p className="text-xs uppercase tracking-widest text-ink-muted">
              Ingredients
            </p>
            <ul className="mt-2 space-y-1 text-ink">
              {ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.quantity ? `${ing.name} — ${ing.quantity}` : ing.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.steps.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-widest text-ink-muted">
              Steps
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-ink">
              {recipe.steps.map((step, i) => (
                <li key={i}>{stripStepNumber(step)}</li>
              ))}
            </ol>
          </div>
        )}
      </article>

      <p className="mt-8 font-mono text-xs text-ink-muted">
        Shared from{" "}
        <Link href="/" className="underline underline-offset-2">
          Reciply
        </Link>{" "}
        — cook what&rsquo;s already in your kitchen.
      </p>
    </div>
  );
}
