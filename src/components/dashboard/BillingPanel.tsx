"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsEvent, track } from "@/lib/analytics";
import {
  TIERS,
  YEARLY_DISCOUNT_PERCENT,
  getTier,
  tierRank,
  yearlyPrice,
  yearlyPricePerMonth,
  type BillingPeriod,
  type PaidTierId,
} from "@/lib/pricing";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/types";
import type { PendingScheduledChange } from "@/lib/stripe";

type Props = {
  currentTierId: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  pendingChange: PendingScheduledChange | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BillingPanel({
  currentTierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  pendingChange,
}: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<PaidTierId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PaidTierId | null>(null);
  const [upgraded, setUpgraded] = useState<{
    tierName: string;
    amountCharged: number | null;
  } | null>(null);

  // A checkout session creates a *new* subscription — fine when the user
  // has no paid plan yet, but the wrong tool for moving between paid tiers
  // (that goes through /api/stripe/change-plan instead, see below).
  // Downgrading and managing/canceling an existing subscription live on
  // the Account settings page instead of here.
  const hasNoPaidPlan = currentTierId === "discovery";
  const currentTier = getTier(currentTierId);

  // Downgrades live on the Account settings page, not here — this tab is
  // "your plan, and what you could upgrade to," so tiers ranked below the
  // current one are left off entirely instead of shown with a downgrade
  // link. (A standalone plans page for signed-out visitors is coming
  // separately; this tab doesn't need to double as that.)
  const visibleTiers = TIERS.filter(
    (t) => t.id === currentTierId || tierRank(t.id) > tierRank(currentTierId)
  );
  const gridColsClass: Record<number, string> = {
    1: "sm:grid-cols-1 lg:grid-cols-1",
    2: "sm:grid-cols-2 lg:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  async function checkout(tierId: PaidTierId) {
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

  async function upgrade(tierId: PaidTierId) {
    setLoading(tierId);
    setError(null);
    setUpgraded(null);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, period }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't change your plan. Try again.");
        setLoading(null);
        return;
      }
      track(AnalyticsEvent.UpgradeClicked, { plan: `${tierId}_${period}_switch` });
      setUpgraded({
        tierName: getTier(tierId).name,
        amountCharged: body.amountCharged ?? null,
      });
      setConfirming(null);
      setLoading(null);
      // The webhook that syncs our tier data lands a moment after Stripe
      // processes this, so give it a beat before refetching.
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError("Couldn't change your plan. Try again.");
      setLoading(null);
    }
  }

  const periodEndLabel = subscriptionCurrentPeriodEnd
    ? formatDate(subscriptionCurrentPeriodEnd)
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
      {pendingChange && (
        <div className="paper-card rounded-sm border-sage/40 p-4 text-sm text-ink">
          Your plan changes to{" "}
          <strong>{getTier(pendingChange.tier).name}</strong> on{" "}
          {formatDate(pendingChange.effectiveDate)}. You&rsquo;ll keep every{" "}
          {currentTier.name} feature and benefit until then.
        </div>
      )}
      {upgraded && (
        <div className="paper-card rounded-sm border-sage/40 p-4 text-sm text-ink">
          Upgraded to <strong>{upgraded.tierName}</strong>! It&rsquo;s active
          right away.{" "}
          {upgraded.amountCharged !== null
            ? `We credited what you'd already paid this cycle and charged you $${upgraded.amountCharged.toFixed(2)} today for the prorated difference.`
            : "The prorated difference for the rest of this cycle was charged today."}
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

      <div
        className={`grid gap-5 ${gridColsClass[visibleTiers.length] ?? gridColsClass[4]} ${
          visibleTiers.length === 1 ? "mx-auto max-w-sm" : ""
        }`}
      >
        {visibleTiers.map((tier) => {
          const isCurrent = tier.id === currentTierId;
          const isPending =
            pendingChange !== null && pendingChange.tier === tier.id;
          const isConfirming = confirming === tier.id;
          const showRecommended = tier.recommended && !isCurrent;
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
                showRecommended
                  ? "border-2 border-accent shadow-lg sm:-translate-y-2"
                  : ""
              }`}
            >
              {showRecommended && (
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
                {isConfirming ? (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-muted">
                      Takes effect right away — we&rsquo;ll credit what
                      you&rsquo;ve already paid this cycle and charge you
                      the prorated difference today.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => upgrade(tier.id as PaidTierId)}
                        className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading === tier.id ? "Working…" : "Confirm upgrade"}
                      </button>
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => setConfirming(null)}
                        className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted"
                  >
                    Current plan
                  </button>
                ) : isPending ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-muted"
                  >
                    Scheduled for {formatDate(pendingChange!.effectiveDate)}
                  </button>
                ) : hasNoPaidPlan ? (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => checkout(tier.id as PaidTierId)}
                    className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      showRecommended
                        ? "bg-accent text-accent-ink hover:opacity-90"
                        : "border border-line hover:border-ink"
                    }`}
                  >
                    {loading === tier.id ? "Redirecting…" : "Upgrade"}
                  </button>
                ) : (
                  // Every remaining tier ranks above currentTierId (see
                  // visibleTiers) and currentTierId is a paid plan (the
                  // hasNoPaidPlan case above already handled the free-plan
                  // checkout path), so anything left here is an upgrade.
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => setConfirming(tier.id as PaidTierId)}
                    className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      showRecommended
                        ? "bg-accent text-accent-ink hover:opacity-90"
                        : "border border-line hover:border-ink"
                    }`}
                  >
                    Upgrade
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
