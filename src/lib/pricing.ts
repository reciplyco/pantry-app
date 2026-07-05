// Single source of truth for the pricing/tier model. The numbers here —
// especially generation caps and the entire Ultimate feature list — are
// first-draft placeholders and are expected to change; keep them here
// rather than hardcoding a limit or a feature string anywhere else so
// there's exactly one place to update when they do.

export type TierId = "discovery" | "essentials" | "pro" | "ultimate";
export type PaidTierId = Exclude<TierId, "discovery">;
export type BillingPeriod = "monthly" | "yearly";

export const PAID_TIER_IDS: PaidTierId[] = ["essentials", "pro", "ultimate"];

export const YEARLY_DISCOUNT_PERCENT = 20;

export type Tier = {
  id: TierId;
  name: string;
  emoji: string;
  monthlyPrice: number;
  recommended?: boolean;
  /** Placeholder — this cap is very likely to be retuned before launch. */
  generationsPerMonth: number;
  features: string[];
};

export const TIERS: Tier[] = [
  {
    id: "discovery",
    name: "Discovery",
    emoji: "🔍",
    monthlyPrice: 0,
    generationsPerMonth: 5,
    features: [
      "Inspiration feed",
      "Pantry management",
      "Ingredient search",
      "Basic filters (time, cuisine, cooking method)",
      "Basic meal planner",
      "3 favorites",
    ],
  },
  {
    id: "essentials",
    name: "Essentials",
    emoji: "🎒",
    monthlyPrice: 15,
    generationsPerMonth: 20,
    features: [
      "Everything in Discovery",
      "10 favorites",
      "Recipe & pantry history",
      "Grocery list generation",
      "Health & dietary filters",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "✨",
    monthlyPrice: 20,
    recommended: true,
    generationsPerMonth: 80,
    features: [
      "Everything in Essentials",
      "Web recipe search",
      "Smart ingredient matching",
      "Recipe compatibility scores",
      "Pantry optimization mode",
      "Leftovers mode",
      "Personalized recommendations",
      "Weekly meal suggestions",
      "Advanced meal planning",
      "Nutrition insights",
      "Pantry analytics",
      "Unlimited grocery lists",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    emoji: "🏆",
    monthlyPrice: 60,
    generationsPerMonth: 500,
    // Placeholder line-up while the final Ultimate feature set is decided —
    // deliberately still capped (just generously) rather than "unlimited",
    // since it's backed by metered AI calls under the hood.
    features: [
      "Everything in Pro",
      "Priority recipe generation",
      "Bulk meal-prep planning",
      "Early access to new features",
      "Priority support",
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
 * the end of the current billing period). */
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
