"use client";

import { useState } from "react";
import { AnalyticsEvent, track } from "@/lib/analytics";
import {
  TIERS,
  YEARLY_DISCOUNT_PERCENT,
  yearlyPrice,
  yearlyPricePerMonth,
  type BillingPeriod,
  type PaidTierId,
} from "@/lib/pricing";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/types";

type Props = {
  currentTierId: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
};

export default function BillingPanel({
  currentTierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
}: Props) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<PaidTierId | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A checkout session creates a *new* subscription — fine when the user
  // has no paid plan yet, but the wrong tool for switching between paid
  // tiers (that goes through the portal instead, see below).
  const hasNoPaidPlan = currentTierId === "discovery";

  async function upgrade(tierId: PaidTierId) {
    setLoading(tierId);
    setError(null);
    track(AnalyticsEvent.UpgradeClicked, { plan: `${tierId}_${period}` });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, period }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setError(body.error ?? "Couldn't start checkout. Try again.");
        setLoading(null);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Couldn't start checkout. Try again.");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setError(body.error ?? "Couldn't open billing portal.");
        setLoading(null);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Couldn't open billing portal.");
      setLoading(null);
    }
  }

  const periodEndLabel = subscriptionCurrentPeriodEnd
    ? new Date(subscriptionCurrentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mt-8 space-y-6">
      {subscriptionStatus === "past_due" && (
        <div className="paper-card rounded-sm border-accent/40 p-4 text-sm text-accent">
          We couldn&rsquo;t charge your card. Update your payment method to
          keep your plan&rsquo;s features.
        </div>
      )}
      {subscriptionStatus === "canceled" && periodEndLabel && (
        <div className="paper-card rounded-sm p-4 text-sm text-ink-muted">
          Your plan is canceled — you&rsquo;ll keep its features until{" "}
          {periodEndLabel}, then move to Discovery.
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
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
            className={`absolute top-1 h-5 w-5 rounded-full bg-accent transition-transform ${
              period === "yearly" ? "translate-x-6" : "translate-x-1"
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTierId;
          const displayPrice =
            tier.monthlyPrice === 0
              ? 0
              : period === "yearly"
                ? yearlyPricePerMonth(tier.monthlyPrice)
                : tier.monthlyPrice;

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

              <div className="mt-5">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted"
                  >
                    Current plan
                  </button>
                ) : tier.id === "discovery" ? (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={openPortal}
                    className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium transition hover:border-ink disabled:opacity-50"
                  >
                    {loading === "portal" ? "Opening…" : "Manage subscription"}
                  </button>
                ) : hasNoPaidPlan ? (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => upgrade(tier.id as PaidTierId)}
                    className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      tier.recommended
                        ? "bg-accent text-accent-ink hover:opacity-90"
                        : "border border-line hover:border-ink"
                    }`}
                  >
                    {loading === tier.id ? "Redirecting…" : "Upgrade"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={openPortal}
                    className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium transition hover:border-ink disabled:opacity-50"
                  >
                    {loading === "portal" ? "Opening…" : "Switch in billing portal"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-accent">{error}</p>}

      <p className="text-center text-xs text-ink-muted">
        Generation limits above are still being tuned and may change.
      </p>
    </div>
  );
}
