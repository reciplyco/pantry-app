export type SubscriptionStatus = "free" | "active" | "past_due" | "canceled";

export type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_current_period_end: string | null;
  created_at: string;
};

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

export const FREE_TIER_WEEKLY_LIMIT = 3;
