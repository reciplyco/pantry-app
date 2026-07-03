import type { Day, Recipe } from "@/lib/types";
import RecipeCard from "./RecipeCard";

type Props = {
  recipes: Recipe[];
  onAddToShoppingList: (recipe: Recipe) => Promise<void>;
  onAddToMealPlan: (recipeId: string, day: Day) => Promise<void>;
};

export default function RecipeGrid({
  recipes,
  onAddToShoppingList,
  onAddToMealPlan,
}: Props) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-medium">Recipes</h2>
      {recipes.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No recipes yet — add pantry items above and generate some.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onAddToShoppingList={onAddToShoppingList}
              onAddToMealPlan={onAddToMealPlan}
            />
          ))}
        </div>
      )}
    </section>
  );
}
