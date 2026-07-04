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

type ActionResult =
  | { kind: "upgraded"; tierName: string; amountCharged: number | null }
  | { kind: "downgraded"; tierName: string; effectiveDate: string };

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
  const [loading, setLoading] = useState<PaidTierId | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PaidTierId | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // A checkout session creates a *new* subscription — fine when the user
  // has no paid plan yet, but the wrong tool for moving between paid
  // tiers (that goes through /api/stripe/change-plan instead, see below).
  const hasNoPaidPlan = currentTierId === "discovery";
  const currentTier = getTier(currentTierId);

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

  async function changePlan(tierId: PaidTierId) {
    setLoading(tierId);
    setError(null);
    setActionResult(null);
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
      const tierName = getTier(tierId).name;
      if (body.kind === "upgraded") {
        track(AnalyticsEvent.UpgradeClicked, { plan: `${tierId}_${period}_switch` });
        setActionResult({
          kind: "upgraded",
          tierName,
          amountCharged: body.amountCharged ?? null,
        });
      } else {
        setActionResult({
          kind: "downgraded",
          tierName,
          effectiveDate: body.effectiveDate,
        });
      }
      setConfirming(null);
      setLoading(null);
      // The webhook that syncs our tier/pending-change data lands a moment
      // after Stripe processes this, so give it a beat before refetching.
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError("Couldn't change your plan. Try again.");
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
      {actionResult?.kind === "upgraded" && (
        <div className="paper-card rounded-sm border-sage/40 p-4 text-sm text-ink">
          Upgraded to <strong>{actionResult.tierName}</strong>! It&rsquo;s
          active right away.{" "}
          {actionResult.amountCharged !== null
            ? `We credited what you'd already paid this cycle and charged you $${actionResult.amountCharged.toFixed(2)} today for the prorated difference.`
            : "The prorated difference for the rest of this cycle was charged today."}
        </div>
      )}
      {actionResult?.kind === "downgraded" && (
        <div className="paper-card rounded-sm border-sage/40 p-4 text-sm text-ink">
          Got it — you&rsquo;re moving to{" "}
          <strong>{actionResult.tierName}</strong> on{" "}
          {formatDate(actionResult.effectiveDate)}. Nothing changes today:
          you&rsquo;ll keep all your current plan&rsquo;s features and
          benefits until then.
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentTierId;
          const isPending =
            pendingChange !== null && pendingChange.tier === tier.id;
          const isConfirming = confirming === tier.id;
          const isUpgradeTarget =
            tier.id !== "discovery" &&
            tierRank(tier.id) > tierRank(currentTierId);
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
                {isConfirming ? (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-muted">
                      {isUpgradeTarget
                        ? `Takes effect right away — we'll credit what you've already paid this cycle and charge you the prorated difference today.`
                        : `Won't take effect until your billing period ends${periodEndLabel ? ` on ${periodEndLabel}` : ""}. You'll keep every ${currentTier.name} feature until then — nothing changes today.`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => changePlan(tier.id as PaidTierId)}
                        className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading === tier.id
                          ? "Working…"
                          : isUpgradeTarget
                            ? "Confirm upgrade"
                            : "Confirm downgrade"}
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
                    onClick={() => checkout(tier.id as PaidTierId)}
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
                    onClick={() => setConfirming(tier.id as PaidTierId)}
                    className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      tier.recommended
                        ? "bg-accent text-accent-ink hover:opacity-90"
                        : "border border-line hover:border-ink"
                    }`}
                  >
                    {isUpgradeTarget ? "Upgrade" : "Downgrade"}
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
