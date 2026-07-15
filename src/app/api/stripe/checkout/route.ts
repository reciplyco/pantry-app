import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe, priceIdForTier } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { PAID_TIER_IDS } from "@/lib/pricing";
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

  const allowed = await checkRateLimit(`stripe-checkout:${user.id}`, 10, 60);
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
  const { tier, period } = parsed.data as {
    tier: (typeof PAID_TIER_IDS)[number];
    period: "monthly" | "yearly";
  };

  const priceId = priceIdForTier(tier, period);
  if (!priceId) {
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

  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/app/billing?checkout=success`,
    cancel_url: `${siteUrl}/app/billing?checkout=cancelled`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    // Prices are AUD/GST-inclusive — Stripe Tax (enabled in the Dashboard,
    // see scripts/create-aud-prices.mjs) works out the GST component of
    // that same total rather than adding to it. customer_update saves the
    // address the customer enters here back onto the Customer object, so
    // renewals keep calculating tax correctly without asking again.
    automatic_tax: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
  });

  return NextResponse.json({ url: session.url });
}
