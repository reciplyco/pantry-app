import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { Profile } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan === "yearly" ? "yearly" : "monthly";
  const priceId =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY!
      : process.env.STRIPE_PRICE_MONTHLY!;

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
  });

  return NextResponse.json({ url: session.url });
}
