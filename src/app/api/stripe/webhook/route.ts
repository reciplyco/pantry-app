import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, mapStripeStatus, subscriptionPeriodEnd } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: mapStripeStatus(subscription.status),
      subscription_current_period_end: subscriptionPeriodEnd(subscription),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to sync subscription to profile", error);
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
