import Stripe from "stripe";
import type { SubscriptionStatus } from "./types";

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
