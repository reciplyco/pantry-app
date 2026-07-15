// One-off setup script — not part of the app, safe to delete once you've
// run it. Creates new AUD, GST-inclusive Stripe Prices for Essentials/Pro/
// Ultimate (monthly + yearly), attached to the *same* Products as your
// existing USD prices, and prints the new price IDs to paste into
// .env.local.
//
// Before running:
//   1. Stripe Dashboard -> Settings -> Tax -> enable Stripe Tax, and add
//      your business's Australian address + ABN under "Where you're
//      registered". This is the part only you can do — nothing below
//      calculates or remits GST without it.
//   2. Make sure .env.local still has the *old* USD price env vars set
//      (this script reads them to find each tier's Product).
//
// Run it (Node 20.6+, reads env straight from .env.local):
//   node --env-file=.env.local scripts/create-aud-prices.mjs
//
// If your Node is older than 20.6, source the file into your shell first:
//   set -a && source .env.local && set +a && node scripts/create-aud-prices.mjs

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Dollar amounts here are the "same digits, relabeled as AUD" numbers from
// src/lib/pricing.ts — keep both in sync if the numbers ever change.
// Yearly = monthlyPrice * 12 * (1 - YEARLY_DISCOUNT_PERCENT/100), rounded,
// same formula as yearlyPrice() in pricing.ts.
const TIERS = [
  {
    envKey: "ESSENTIALS",
    monthly: 15,
    yearly: 144,
    existingMonthlyPriceId: process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY,
    existingYearlyPriceId: process.env.STRIPE_PRICE_ESSENTIALS_YEARLY,
  },
  {
    envKey: "PRO",
    monthly: 20,
    yearly: 192,
    existingMonthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    existingYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  {
    envKey: "ULTIMATE",
    monthly: 100,
    yearly: 960,
    existingMonthlyPriceId: process.env.STRIPE_PRICE_ULTIMATE_MONTHLY,
    existingYearlyPriceId: process.env.STRIPE_PRICE_ULTIMATE_YEARLY,
  },
];

async function createAudPrice(productId, unitAmountDollars, interval) {
  const price = await stripe.prices.create({
    product: productId,
    currency: "aud",
    unit_amount: Math.round(unitAmountDollars * 100),
    recurring: { interval },
    tax_behavior: "inclusive",
  });
  return price.id;
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error(
      "STRIPE_SECRET_KEY isn't set — run with: node --env-file=.env.local scripts/create-aud-prices.mjs"
    );
    process.exit(1);
  }

  console.log("Creating AUD, GST-inclusive prices...\n");
  const newEnvLines = [];

  for (const tier of TIERS) {
    if (!tier.existingMonthlyPriceId || !tier.existingYearlyPriceId) {
      console.warn(`Skipping ${tier.envKey} — missing existing USD price env var(s).`);
      continue;
    }

    const existingMonthly = await stripe.prices.retrieve(tier.existingMonthlyPriceId);
    const productId =
      typeof existingMonthly.product === "string"
        ? existingMonthly.product
        : existingMonthly.product.id;

    const monthlyId = await createAudPrice(productId, tier.monthly, "month");
    const yearlyId = await createAudPrice(productId, tier.yearly, "year");

    console.log(`${tier.envKey}: monthly=${monthlyId} ($${tier.monthly} AUD)  yearly=${yearlyId} ($${tier.yearly} AUD)`);

    newEnvLines.push(`STRIPE_PRICE_${tier.envKey}_MONTHLY=${monthlyId}`);
    newEnvLines.push(`STRIPE_PRICE_${tier.envKey}_YEARLY=${yearlyId}`);
  }

  console.log("\nPaste these into .env.local, replacing the old USD price IDs:\n");
  console.log(newEnvLines.join("\n"));
  console.log(
    "\nThe old USD prices aren't touched — they're just unused once you swap the env vars. Archive them from the Stripe Dashboard later if you want them fully retired."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
