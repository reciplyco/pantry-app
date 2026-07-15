// Single source of truth for the pricing/tier model. Every per-tier number —
// generation/search caps, favorites, shopping-list size, history depth — and
// every gated feature lives here so there's exactly one place to update when
// they change. Two of these numbers (favoritesCap, shoppingListCap) are also
// duplicated inside supabase/migrations for the count-enforcing Postgres
// triggers — see the comment there — because Postgres can't import this file.

export type TierId = "discovery" | "essentials" | "pro" | "ultimate";
export type PaidTierId = Exclude<TierId, "discovery">;
export type BillingPeriod = "monthly" | "yearly";

export const PAID_TIER_IDS: PaidTierId[] = ["essentials", "pro", "ultimate"];

export const YEARLY_DISCOUNT_PERCENT = 20;

// All prices are AUD, GST-inclusive (the sticker price is the total charged
// — Stripe Tax splits out the GST portion for reporting, it doesn't add to
// the price). See stripe/checkout and stripe/change-plan for where
// automatic_tax is turned on, and scripts/create-aud-prices.mjs for how the
// AUD Price objects themselves get created.
export const CURRENCY_LABEL = "AUD";
export const GST_NOTE = "All prices are in AUD and include GST.";

export type TierFeature = {
  label: string;
  /** Real and shipped, but not yet enforced/available — render with a "soon" tag instead of a checkmark-as-promise. */
  comingSoon?: boolean;
};

export type Tier = {
  id: TierId;
  name: string;
  emoji: string;
  monthlyPrice: number;
  recommended?: boolean;
  generationsPerWeek: number;
  webSearchesPerWeek: number;
  /** null = unlimited */
  favoritesCap: number | null;
  /** null = unlimited */
  shoppingListCap: number | null;
  /** null = full history; otherwise only the N most recent recipes are returned */
  historyCap: number | null;
  features: TierFeature[];
};

export const TIERS: Tier[] = [
  {
    id: "discovery",
    name: "Discovery",
    emoji: "🔍",
    monthlyPrice: 0,
    generationsPerWeek: 5,
    webSearchesPerWeek: 5,
    favoritesCap: 3,
    shoppingListCap: 15,
    historyCap: 10,
    features: [
      { label: "Pantry management with AI-checked entries" },
      { label: "3 favorites" },
      { label: "Basic search filters (time, cuisine, cooking method)" },
      { label: "Weekly meal planner" },
      { label: "Share recipes with a link" },
    ],
  },
  {
    id: "essentials",
    name: "Essentials",
    emoji: "🎒",
    monthlyPrice: 15,
    generationsPerWeek: 20,
    webSearchesPerWeek: 25,
    favoritesCap: 10,
    shoppingListCap: null,
    historyCap: null,
    features: [
      { label: "Everything in Discovery" },
      { label: "Full recipe & pantry history" },
      { label: "10 favorites" },
      { label: "Unlimited shopping list" },
      { label: "Dietary & health filters" },
      { label: "Leftovers mode" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "✨",
    monthlyPrice: 20,
    recommended: true,
    generationsPerWeek: 80,
    webSearchesPerWeek: 150,
    favoritesCap: null,
    shoppingListCap: null,
    historyCap: null,
    features: [
      { label: "Everything in Essentials" },
      { label: "Unlimited favorites" },
      { label: "Nutrition insights" },
      { label: "Pantry analytics" },
      { label: "Suggest-for-me recommendations" },
      { label: "Multi-day meal plan assignment" },
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    emoji: "🏆",
    monthlyPrice: 100,
    generationsPerWeek: 500,
    webSearchesPerWeek: 500,
    favoritesCap: null,
    shoppingListCap: null,
    historyCap: null,
    features: [
      { label: "Everything in Pro" },
      { label: "Bulk meal-prep planning" },
      { label: "Early access to new features", comingSoon: true },
      { label: "Priority support" },
    ],
  },
];

export function getTier(id: TierId): Tier {
  const tier = TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown tier id: ${id}`);
  return tier;
}

/** Position in the Discovery < Essentials < Pro < Ultimate ladder — used to
 * tell an upgrade (take effect now, prorated) from a downgrade (deferred to
 * the end of the current billing period), and to check gated-feature access. */
export function tierRank(id: TierId): number {
  return TIERS.findIndex((t) => t.id === id);
}

/** Whichever tier a profile's limits/features are actually determined by
 * right now — a lapsed or past-due subscription doesn't keep paid perks.
 * A "canceled" status means cancel-at-period-end (set from the Stripe
 * billing portal): the subscription is still genuinely live in Stripe, so
 * it keeps its tier until the webhook hears the subscription is truly over
 * and resets subscription_tier to "discovery" itself (see the webhook's
 * syncSubscription) — this function doesn't need to guess from a date,
 * since Stripe can keep reporting the same current_period_end well after a
 * subscription is actually gone. */
export function effectiveTierId(
  subscriptionStatus: string,
  subscriptionTier: TierId | null | undefined
): TierId {
  if (!subscriptionTier) return "discovery";
  if (subscriptionStatus === "active" || subscriptionStatus === "canceled") {
    return subscriptionTier;
  }
  return "discovery";
}

export function yearlyPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
}

/** The "$X/mo" figure to show when yearly billing is selected. */
export function yearlyPricePerMonth(monthlyPrice: number): number {
  return Math.round(yearlyPrice(monthlyPrice) / 12);
}

/** Capabilities that are gated on a minimum tier rather than a numeric cap —
 * dietary/health constraints applied to generation, and hiding the nutrition
 * panel on recipe cards. Numeric caps (favorites, shopping list, history,
 * generations, searches) live directly on the Tier objects above instead. */
export type GatedFeature =
  | "dietaryFilters"
  | "leftoversMode"
  | "nutritionInsights"
  | "pantryAnalytics"
  | "suggestForMe"
  | "multiDayPlanning"
  | "bulkMealPrep";

export const FEATURE_MIN_TIER: Record<GatedFeature, TierId> = {
  dietaryFilters: "essentials",
  leftoversMode: "essentials",
  nutritionInsights: "pro",
  pantryAnalytics: "pro",
  suggestForMe: "pro",
  multiDayPlanning: "pro",
  bulkMealPrep: "ultimate",
};

export function hasFeature(tierId: TierId, feature: GatedFeature): boolean {
  return tierRank(tierId) >= tierRank(FEATURE_MIN_TIER[feature]);
}
