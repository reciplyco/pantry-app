import Stripe from "stripe";
import type { SubscriptionStatus } from "./types";
import type { BillingPeriod, PaidTierId } from "./pricing";

// Lazily instantiated: Next.js evaluates route handler modules while
// collecting page data at build time, before env vars from a fresh Vercel
// project are necessarily available. Creating the client eagerly at module
// scope would crash the build; a Proxy defers construction to first use
// inside an actual request.
let _stripe: Stripe | null = null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    }
    return Reflect.get(_stripe, prop, receiver);
  },
});

export function mapStripeStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

export function subscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const seconds = subscription.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

// Env-var-backed price IDs for each paid tier — see .env.local. Discovery
// has no Stripe price since it's free.
const TIER_PRICE_ENV: Record<PaidTierId, Record<BillingPeriod, string | undefined>> = {
  essentials: {
    monthly: process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ESSENTIALS_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  ultimate: {
    monthly: process.env.STRIPE_PRICE_ULTIMATE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_ULTIMATE_YEARLY,
  },
};

export function priceIdForTier(
  tier: PaidTierId,
  period: BillingPeriod
): string | null {
  return TIER_PRICE_ENV[tier][period] ?? null;
}

export function tierForPriceId(priceId: string): PaidTierId | null {
  for (const tier of Object.keys(TIER_PRICE_ENV) as PaidTierId[]) {
    const periods = TIER_PRICE_ENV[tier];
    if (periods.monthly === priceId || periods.yearly === priceId) {
      return tier;
    }
  }
  return null;
}
