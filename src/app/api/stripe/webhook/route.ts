import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  stripe,
  mapStripeStatus,
  subscriptionPeriodEnd,
  tierForPriceId,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPosthogServerClient } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, subscription_status")
    .eq("stripe_customer_id", customerId)
    .single();

  // A cancel_at_period_end subscription is still genuinely live in Stripe —
  // the customer keeps their tier's features and could still un-cancel —
  // so it maps to "canceled" (for the UI banner) while keeping the old
  // tier. But once Stripe reports the subscription as truly over (deleted,
  // or a terminal status that ISN'T just a scheduled cancel), there's
  // nothing left to retain. Stripe keeps reporting the same
  // current_period_end even after that point, so date math can't tell
  // these two states apart at read time — only the raw status can, right
  // here, when we actually hear about it.
  const isTerminallyCanceled =
    !subscription.cancel_at_period_end &&
    (subscription.status === "canceled" ||
      subscription.status === "incomplete_expired");

  const newStatus = isTerminallyCanceled ? "free" : mapStripeStatus(subscription);
  const priceId = subscription.items.data[0]?.price.id;
  const tier = isTerminallyCanceled
    ? "discovery"
    : priceId
      ? tierForPriceId(priceId)
      : null;

  // Split into two updates so a missing subscription_tier column (e.g.
  // migration 0006 not applied yet) can't take down the status/period-end
  // sync that's been working in production all along.
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: newStatus,
      subscription_current_period_end: subscriptionPeriodEnd(subscription),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to sync subscription to profile", error);
    return;
  }

  // Only overwrite the tier when it's a terminal cancellation (reset to
  // discovery) or we can confidently resolve it from the subscription's
  // price — otherwise leave whatever tier the profile already has rather
  // than silently resetting it to null.
  if (tier) {
    const { error: tierError } = await supabase
      .from("profiles")
      .update({ subscription_tier: tier })
      .eq("stripe_customer_id", customerId);
    if (tierError) {
      console.error(
        "Failed to sync subscription_tier (has migration 0006 been applied?)",
        tierError
      );
    }
  }

  // Fire the activation event only on the transition into "active", not on
  // every subsequent webhook (renewals, payment method updates, etc. also
  // trigger customer.subscription.updated with status unchanged).
  if (existing && existing.subscription_status !== "active" && newStatus === "active") {
    const posthog = getPosthogServerClient();
    if (posthog) {
      await posthog.captureImmediate({
        distinctId: existing.id,
        event: AnalyticsEvent.SubscriptionUpgraded,
      });
    }
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );
        await syncSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
