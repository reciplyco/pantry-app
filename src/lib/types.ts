import type { TierId } from "./pricing";

export type SubscriptionStatus = "free" | "active" | "past_due" | "canceled";
export type SubscriptionTier = TierId;

// Generated recipe steps sometimes come back with a leading "1. " already
// baked into the text; strip it so it doesn't double up with the <ol>'s
// own numbering.
export function stripStepNumber(step: string): string {
  return step.replace(/^\s*\d+[.)]\s*/, "");
}

export type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_current_period_end: string | null;
  created_at: string;
  dietary_preferences: string[];
  dietary_notes: string | null;
};

export const DIETARY_PREFERENCE_OPTIONS = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "low-carb",
  "keto",
] as const;

export type PantryItem = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type NeedIngredient = {
  name: string;
  quantity: string;
};

export type Nutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  time_minutes: number | null;
  servings: number | null;
  have_ingredients: string[];
  need_ingredients: NeedIngredient[];
  steps: string[];
  nutrition: Nutrition | null;
  created_at: string;
  share_token: string | null;
  is_favorite: boolean;
};

export type ShoppingListItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  source_recipe_id: string | null;
  checked: boolean;
  created_at: string;
};

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type MealPlanEntry = {
  id: string;
  user_id: string;
  day: Day;
  week_start_date: string;
  recipe_id: string;
  created_at: string;
};

export type MealPlanEntryWithRecipe = MealPlanEntry & {
  recipe: Pick<
    Recipe,
    "id" | "title" | "time_minutes" | "servings" | "need_ingredients"
  > | null;
};

export const SEARCH_TIME_OPTIONS = [15, 30, 60] as const;

export const SEARCH_CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Thai",
  "Chinese",
  "Indian",
  "French",
  "Japanese",
  "Mediterranean",
  "American",
  "Greek",
] as const;

export const SEARCH_METHOD_OPTIONS = [
  { value: "bake", label: "Bake" },
  { value: "stovetop", label: "Stovetop" },
  { value: "slow cooker", label: "Slow cooker" },
  { value: "air fryer", label: "Air fryer" },
  { value: "grill", label: "Grill" },
  { value: "no-cook", label: "No-cook" },
] as const;

export const SEARCH_DIET_OPTIONS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "nut-free", label: "Nut-free" },
  { value: "keto", label: "Keto" },
] as const;

export type SearchSort = "match" | "time" | "popularity";

export type SearchRecipeResult = {
  id: number;
  title: string;
  sourceName: string | null;
  sourceUrl: string;
  image: string | null;
  matchPercent: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  readyInMinutes: number | null;
  popularity: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
};
