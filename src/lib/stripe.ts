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
  subscription: Stripe.Subscription
): SubscriptionStatus {
  // A cancellation from the Stripe billing portal sets cancel_at_period_end
  // rather than changing status — Stripe's status stays "active" right up
  // until the subscription actually ends. Treat that the same as "canceled"
  // so the UI can tell the customer right away, instead of only once the
  // subscription is gone for good.
  if (subscription.cancel_at_period_end) {
    return "canceled";
  }
  switch (subscription.status) {
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

/** The customer's current paid subscription, if any — status can be
 * "active" or "trialing" (both treated as active elsewhere in the app). */
export async function getActiveSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
  return (
    subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
    null
  );
}

export type PendingScheduledChange = {
  tier: PaidTierId;
  effectiveDate: string;
};

/** If this subscription has a downgrade scheduled (see the change-plan
 * route), returns the tier it's switching to and when — so the billing UI
 * can say so clearly instead of the change happening silently later. */
export async function getPendingScheduledChange(
  subscription: Stripe.Subscription
): Promise<PendingScheduledChange | null> {
  if (!subscription.schedule) return null;
  const scheduleId =
    typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule.id;
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const now = Math.floor(Date.now() / 1000);
  const upcomingPhase = schedule.phases.find((p) => p.start_date > now);
  if (!upcomingPhase) return null;

  const item = upcomingPhase.items[0];
  const priceId = item ? (typeof item.price === "string" ? item.price : item.price.id) : null;
  const tier = priceId ? tierForPriceId(priceId) : null;
  if (!tier) return null;

  return {
    tier,
    effectiveDate: new Date(upcomingPhase.start_date * 1000).toISOString(),
  };
}
