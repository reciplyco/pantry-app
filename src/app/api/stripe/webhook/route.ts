import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, mapStripeStatus, subscriptionPeriodEnd } from "@/lib/stripe";
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

  const newStatus = mapStripeStatus(subscription.status);

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
