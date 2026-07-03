import Stripe from "stripe";
import type { SubscriptionStatus } from "./types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
