"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TIERS,
  YEARLY_DISCOUNT_PERCENT,
  yearlyPrice,
  yearlyPricePerMonth,
  type BillingPeriod,
} from "@/lib/pricing";

export default function MarketingPricing() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <div>
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Pricing
        </p>
        <h2 className="mt-2 font-serif text-3xl font-medium">
          Simple pricing, cancel any time
        </h2>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          Start free, upgrade whenever you&rsquo;re ready for more recipe
          generations and features.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium ${period === "monthly" ? "text-ink" : "text-ink-muted"}`}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={period === "yearly"}
          aria-label="Toggle yearly billing"
          onClick={() =>
            setPeriod((p) => (p === "monthly" ? "yearly" : "monthly"))
          }
          className="relative h-7 w-12 shrink-0 rounded-full bg-line transition"
        >
          <span
            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-accent transition-transform ${
              period === "yearly" ? "[transform:translateX(20px)]" : "[transform:translateX(0)]"
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${period === "yearly" ? "text-ink" : "text-ink-muted"}`}
        >
          Yearly
        </span>
        <span className="rounded-full bg-sage px-2.5 py-1 font-mono text-xs font-medium text-sage-ink">
          Save {YEARLY_DISCOUNT_PERCENT}%
        </span>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const displayPrice =
            tier.monthlyPrice === 0
              ? 0
              : period === "yearly"
                ? yearlyPricePerMonth(tier.monthlyPrice)
                : tier.monthlyPrice;
          const href =
            tier.monthlyPrice === 0
              ? "/login?tab=signup"
              : `/login?tab=signup&plan=${tier.id}&period=${period}`;
          const ctaLabel = tier.monthlyPrice === 0 ? "Get started free" : "Subscribe";

          return (
            <div
              key={tier.id}
              className={`paper-card relative flex flex-col rounded-sm p-6 ${
                tier.recommended
                  ? "border-2 border-accent shadow-lg sm:-translate-y-2"
                  : ""
              }`}
            >
              {tier.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 font-mono text-xs font-medium uppercase tracking-widest text-accent-ink shadow-sm">
                  ★ Recommended
                </span>
              )}

              <p className="text-2xl" aria-hidden="true">
                {tier.emoji}
              </p>
              <h3 className="mt-2 font-serif text-xl font-medium">
                {tier.name}
              </h3>

              <p className="mt-2">
                <span className="text-2xl font-medium">${displayPrice}</span>
                <span className="text-sm text-ink-muted">
                  {tier.monthlyPrice === 0 ? "" : " / month"}
                </span>
              </p>
              {tier.monthlyPrice > 0 && period === "yearly" && (
                <p className="mt-0.5 font-mono text-xs text-ink-muted">
                  billed ${yearlyPrice(tier.monthlyPrice)}/year
                </p>
              )}

              <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {tier.generationsPerMonth} AI generations / month
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-muted">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-sage" aria-hidden="true">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.id === "ultimate" && (
                <p className="mt-3 text-xs italic text-ink-muted">
                  Final feature set coming soon — this is a preview lineup.
                </p>
              )}

              <Link
                href={href}
                className={`mt-5 block w-full rounded-full px-5 py-2.5 text-center text-sm font-medium transition ${
                  tier.recommended
                    ? "bg-accent text-accent-ink hover:opacity-90"
                    : "border border-line hover:border-ink"
                }`}
              >
                {ctaLabel}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Generation limits above are still being tuned and may change.
      </p>
    </div>
  );
}
