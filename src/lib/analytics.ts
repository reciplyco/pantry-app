import posthog from "posthog-js";

/**
 * Consistent event names for the onboarding → activation → retention
 * funnel. snake_case, past tense, action_object shape.
 */
export const AnalyticsEvent = {
  UserSignedUp: "user_signed_up",
  UserSignedIn: "user_signed_in",
  PantryItemAdded: "pantry_item_added",
  RecipeGenerated: "recipe_generated",
  ShoppingListItemAdded: "shopping_list_item_added",
  MealPlanEntryAdded: "meal_plan_entry_added",
  RecipeShared: "recipe_shared",
  RecipeSearchPerformed: "recipe_search_performed",
  ExternalRecipeViewed: "external_recipe_viewed",
  UpgradeClicked: "upgrade_clicked",
  SubscriptionUpgraded: "subscription_upgraded",
} as const;

export function track(
  event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent],
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, email: string | null) {
  posthog.identify(userId, email ? { email } : undefined);
}

export { posthog };
