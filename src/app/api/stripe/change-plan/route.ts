import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  stripe,
  priceIdForTier,
  tierForPriceId,
  getActiveSubscription,
} from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { PAID_TIER_IDS, tierRank, type PaidTierId } from "@/lib/pricing";
import type { Profile } from "@/lib/types";

const requestSchema = z.object({
  tier: z.enum(PAID_TIER_IDS as [string, ...string[]]),
  period: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`stripe-change-plan:${user.id}`, 10, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  const { tier: targetTierId, period } = parsed.data as {
    tier: PaidTierId;
    period: "monthly" | "yearly";
  };

  const newPriceId = priceIdForTier(targetTierId, period);
  if (!newPriceId) {
    return NextResponse.json(
      { error: "That plan isn't available yet." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // "canceled" here just means cancel-at-period-end (see mapStripeStatus) —
  // the Stripe subscription is still live and modifiable until the period
  // actually ends, so a change of heart can still upgrade/downgrade out of
  // the pending cancellation instead of being stuck until it lapses.
  const hasChangeableSubscription =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "canceled";
  if (!profile?.stripe_customer_id || !hasChangeableSubscription) {
    return NextResponse.json(
      {
        error:
          "You don't have an active subscription to change — choose a plan to get started instead.",
      },
      { status: 400 }
    );
  }

  const subscription = await getActiveSubscription(profile.stripe_customer_id);
  if (!subscription) {
    return NextResponse.json(
      { error: "Couldn't find your active subscription." },
      { status: 400 }
    );
  }

  const currentItem = subscription.items.data[0];
  if (!currentItem) {
    return NextResponse.json(
      { error: "Couldn't find your current plan details." },
      { status: 500 }
    );
  }
  if (currentItem.price.id === newPriceId) {
    const isPendingCancellation =
      subscription.cancel_at_period_end || subscription.cancel_at != null;
    if (!isPendingCancellation) {
      return NextResponse.json(
        { error: "You're already on this plan." },
        { status: 400 }
      );
    }
    // Same plan, just scheduled to cancel — the Billing tab shows this as
    // "subscribe again" once canceled, so undo the cancellation instead of
    // erroring. No price change, so nothing to invoice or prorate.
    try {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
        cancel_at: null,
      });
      return NextResponse.json({ kind: "reactivated", tier: targetTierId });
    } catch (err) {
      console.error("Failed to reactivate subscription", err);
      const message =
        err instanceof Stripe.errors.StripeError
          ? err.message
          : "Couldn't reactivate your plan. Try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const currentTierId = tierForPriceId(currentItem.price.id);
  const isUpgrade =
    !currentTierId || tierRank(targetTierId) > tierRank(currentTierId);

  try {
    // Release any previously-scheduled change first so every request
    // starts from a clean, unscheduled subscription — otherwise a customer
    // who changes their mind after scheduling a downgrade could end up
    // with two conflicting schedules.
    if (subscription.schedule) {
      const scheduleId =
        typeof subscription.schedule === "string"
          ? subscription.schedule
          : subscription.schedule.id;
      await stripe.subscriptionSchedules.release(scheduleId).catch(() => {});
    }

    if (isUpgrade) {
      // Upgrades take effect immediately: credit whatever's left of the
      // current period on the old price, charge the prorated difference
      // for the new one, and invoice for it right now rather than waiting
      // for the next renewal.
      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [{ id: currentItem.id, price: newPriceId }],
        proration_behavior: "always_invoice",
        // A previous cancel-via-portal attempt shouldn't survive an
        // explicit plan change — clear both representations Stripe uses
        // for a scheduled cancellation (see mapStripeStatus in stripe.ts:
        // this API version can set `cancel_at` without ever setting
        // cancel_at_period_end, so both need clearing or the subscription
        // would still read as "canceled" after this upgrade).
        cancel_at_period_end: false,
        cancel_at: null,
        expand: ["latest_invoice"],
      });

      const invoice = updated.latest_invoice;
      const amountCharged =
        invoice && typeof invoice !== "string"
          ? invoice.amount_paid / 100
          : null;

      return NextResponse.json({
        kind: "upgraded",
        tier: targetTierId,
        amountCharged,
      });
    }

    // Downgrades are deferred to the end of the current billing period, so
    // the customer keeps their current tier's features until then instead
    // of losing them the moment they confirm.
    const periodEnd = currentItem.current_period_end;
    if (!periodEnd) {
      return NextResponse.json(
        { error: "Couldn't determine your current billing period." },
        { status: 500 }
      );
    }

    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
    const currentPhase = schedule.phases[0];

    await stripe.subscriptionSchedules.update(schedule.id, {
      phases: [
        {
          items: currentPhase.items.map((item) => ({
            price:
              typeof item.price === "string" ? item.price : item.price.id,
            quantity: item.quantity ?? 1,
          })),
          start_date: currentPhase.start_date,
          end_date: periodEnd,
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          start_date: periodEnd,
        },
      ],
      // A schedule created from a subscription that had a pending
      // cancellation (e.g. from an earlier trip through the Stripe portal)
      // otherwise inherits a non-"release" end behavior, which requires
      // every phase — including this open-ended final one — to specify an
      // end_date. We want the new tier to just keep renewing normally.
      end_behavior: "release",
      proration_behavior: "none",
    });

    return NextResponse.json({
      kind: "downgraded",
      tier: targetTierId,
      effectiveDate: new Date(periodEnd * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Failed to change plan", err);
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : "Couldn't change your plan. Try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
