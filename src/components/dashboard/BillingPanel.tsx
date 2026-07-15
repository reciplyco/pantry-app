"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsEvent, track } from "@/lib/analytics";
import {
  TIERS,
  YEARLY_DISCOUNT_PERCENT,
  CURRENCY_LABEL,
  GST_NOTE,
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
  autocheckoutTier: PaidTierId | null;
  autocheckoutPeriod: BillingPeriod;
  // The Billing tab only shows the current plan and upgrades — downgrades
  // live on the Account settings page. The standalone "all plans" page
  // (linked from Account's "See all plans") sets this to show every tier,
  // current-or-not, the same way the signed-out marketing pricing page does.
  showAllTiers?: boolean;
};

// Pinned to UTC so this always agrees with the date shown in AppHeader —
// otherwise a client component (this one) and a server-rendered one can
// read the same timestamp a day apart depending on the visitor's timezone.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BillingPanel({
  currentTierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  pendingChange,
  autocheckoutTier,
  autocheckoutPeriod,
  showAllTiers = false,
}: Props) {
  const router = useRouter();
  // Defaults to whatever period a visitor picked on the marketing pricing
  // section before signing up (see autocheckoutPeriod below) — "monthly"
  // when there's no such plan in flight, same as before.
  const [period, setPeriod] = useState<BillingPeriod>(autocheckoutPeriod);
  const [loading, setLoading] = useState<PaidTierId | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pre-opens the confirm-upgrade step when arriving via autocheckout and
  // the visitor already has some paid plan (see the effect below for why
  // that case doesn't just fire checkout() directly).
  const [confirming, setConfirming] = useState<PaidTierId | null>(() =>
    autocheckoutTier &&
    currentTierId !== "discovery" &&
    tierRank(autocheckoutTier) > tierRank(currentTierId)
      ? autocheckoutTier
      : null
  );
  const [changeResult, setChangeResult] = useState<{
    kind: "upgraded" | "downgraded" | "reactivated";
    tierName: string;
    amountCharged: number | null;
    effectiveDate: string | null;
  } | null>(null);

  // A checkout session creates a *new* subscription — fine when the user
  // has no paid plan yet, but the wrong tool for moving between paid tiers
  // (that goes through /api/stripe/change-plan instead, see below).
  // Downgrading and managing/canceling an existing subscription live on
  // the Account settings page instead of here.
  const hasNoPaidPlan = currentTierId === "discovery";
  const currentTier = getTier(currentTierId);
  const discoveryName = getTier("discovery").name;

  // A canceled subscription (or one with a downgrade scheduled) is still
  // live in Stripe under the hood (see effectiveTierId/mapStripeStatus) —
  // generation limits etc. correctly keep using `currentTierId` for that.
  // But this tab should *look* like the customer is already on whichever
  // tier they're headed to — Discovery if canceling, or the pendingChange
  // target if a downgrade to another paid tier is scheduled — with every
  // plan (including the one they're moving off of) shown as something to
  // subscribe to again, not like they still have their old active plan.
  const isCanceling = subscriptionStatus === "canceled";
  const displayTierId: SubscriptionTier = isCanceling
    ? "discovery"
    : (pendingChange?.tier ?? currentTierId);
  // Drives whether tier cards read as "Subscribe" (you're effectively
  // already on displayTierId, just picking a plan) vs. "Upgrade" (you have
  // an active plan and are changing it).
  const showsAsSubscribe = isCanceling || pendingChange != null;

  // Normally "your plan, and what you could upgrade to" — tiers ranked
  // below the current one are left off, since downgrading otherwise lives
  // on the Account settings page. While canceling or mid-downgrade,
  // displayTierId is whatever tier the customer is headed to, so every
  // tier (including ones below the real currentTierId) shows up here again
  // — see isDowngrade below for how those are handled. showAllTiers (the
  // standalone "all plans" page) skips this filtering entirely.
  const visibleTiers = showAllTiers
    ? TIERS
    : TIERS.filter(
        (t) => t.id === displayTierId || tierRank(t.id) > tierRank(displayTierId)
      );
  const gridColsClass: Record<number, string> = {
    1: "sm:grid-cols-1 lg:grid-cols-1",
    2: "sm:grid-cols-2 lg:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  // useCallback (rather than a plain function) so the autocheckout effect
  // below can list it as a dependency without that dependency changing on
  // every render.
  const checkout = useCallback(async (tierId: PaidTierId, source: "landing" | "billing" = "billing") => {
    setLoading(tierId);
    setError(null);
    track(AnalyticsEvent.UpgradeClicked, { plan: `${tierId}_${period}`, source });
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
  }, [period]);

  async function upgrade(tierId: PaidTierId) {
    setLoading(tierId);
    setError(null);
    setChangeResult(null);
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
      setChangeResult({
        kind: body.kind,
        tierName: getTier(tierId).name,
        amountCharged: body.amountCharged ?? null,
        effectiveDate: body.effectiveDate ?? null,
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

  // A visitor who picked a plan on the marketing pricing section before
  // signing up, and has no paid plan yet (the overwhelmingly common case
  // for this funnel), skips straight to Stripe Checkout instead of having
  // to click "Upgrade" again — the initial `confirming` state above already
  // handles the rarer existing-subscriber case without needing an effect.
  // Guarded by a ref (rather than an empty dependency array) so the actual
  // checkout() call only ever fires once per mount, while the dependency
  // array itself stays honest for exhaustive-deps. checkout() itself sets
  // component state (loading/error) as soon as it runs, which is only safe
  // to trigger from an effect one tick after mount rather than synchronously
  // during the effect's commit — hence the 0ms timeout, not a busy-wait.
  const autocheckoutHandled = useRef(false);
  useEffect(() => {
    if (autocheckoutHandled.current || !autocheckoutTier || !hasNoPaidPlan) return;
    if (tierRank(autocheckoutTier) <= tierRank(currentTierId)) return;
    autocheckoutHandled.current = true;
    const timer = setTimeout(() => checkout(autocheckoutTier, "landing"), 0);
    return () => clearTimeout(timer);
  }, [autocheckoutTier, currentTierId, hasNoPaidPlan, checkout]);

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
          You&rsquo;re on the <strong>{discoveryName}</strong> plan now —
          your {currentTier.name}{" "}plan is canceled, but you&rsquo;ll keep
          its features until {periodEndLabel}. After that, it&rsquo;s{" "}
          {discoveryName} from here.
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
      {changeResult && (
        <div className="paper-card rounded-sm border-sage/40 p-4 text-sm text-ink">
          {changeResult.kind === "reactivated" ? (
            <>
              Your <strong>{changeResult.tierName}</strong>{" "}plan is active
              again — the scheduled cancellation has been undone, and
              billing continues as normal.
            </>
          ) : changeResult.kind === "downgraded" ? (
            <>
              Got it — you&rsquo;re moving to{" "}
              <strong>{changeResult.tierName}</strong>{" "}
              {changeResult.effectiveDate
                ? `on ${formatDate(changeResult.effectiveDate)}`
                : "at the end of your current billing period"}
              . You&rsquo;ll keep every {currentTier.name}{" "}feature and
              benefit until then.
            </>
          ) : (
            <>
              Upgraded to <strong>{changeResult.tierName}</strong>!{" "}
              It&rsquo;s active right away.{" "}
              {changeResult.amountCharged !== null
                ? `We credited what you'd already paid this cycle and charged you $${changeResult.amountCharged.toFixed(2)} today for the prorated difference.`
                : "The prorated difference for the rest of this cycle was charged today."}
            </>
          )}
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
          // isCurrent already covers the pendingChange target tier too
          // (displayTierId is pendingChange.tier when one exists), so
          // there's no separate "isPending" case left to show a disabled
          // "Scheduled for X" button — the card just reads as current.
          const isCurrent = tier.id === displayTierId;
          const isConfirming = confirming === tier.id;
          const showRecommended = tier.recommended && !isCurrent;
          // Re-picking the plan you're actually still on right now (either
          // canceling out of it, or mid-downgrade away from it) — same
          // price, so change-plan just undoes the scheduled change (see the
          // "same price" branch in that route) instead of erroring "you're
          // already on this plan."
          const isReactivation =
            (isCanceling || pendingChange != null) &&
            tier.id === currentTierId;
          // Ranked below the real currentTierId — only reachable while
          // canceling or mid-downgrade (visibleTiers is filtered by
          // displayTierId then) or on the showAllTiers page (unfiltered).
          const isDowngrade =
            !isReactivation && tierRank(tier.id) < tierRank(currentTierId);
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
                  {tier.monthlyPrice === 0
                    ? ` ${CURRENCY_LABEL}`
                    : ` ${CURRENCY_LABEL} / month`}
                </span>
              </p>
              {tier.monthlyPrice > 0 && period === "yearly" && (
                <p className="mt-0.5 font-mono text-xs text-ink-muted">
                  billed ${yearlyPrice(tier.monthlyPrice)} {CURRENCY_LABEL}/year
                </p>
              )}

              <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {tier.generationsPerWeek} AI generations / week
              </p>
              <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {tier.webSearchesPerWeek} web recipe searches / week
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-muted">
                {tier.features.map((feature) => (
                  <li key={feature.label} className="flex gap-2">
                    <span className="text-sage" aria-hidden="true">
                      ✓
                    </span>
                    <span>
                      {feature.label}
                      {feature.comingSoon && (
                        <span className="ml-1.5 rounded-full bg-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                          Coming soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isConfirming ? (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-muted">
                      {isReactivation
                        ? "This undoes the scheduled change — same plan, same price, billing continues as normal."
                        : isDowngrade
                          ? `Takes effect at the end of your current billing period — you'll keep ${currentTier.name} features until then.`
                          : "Takes effect right away — we'll credit what you've already paid this cycle and charge you the prorated difference today."}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => upgrade(tier.id as PaidTierId)}
                        className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading === tier.id
                          ? "Working…"
                          : isReactivation
                            ? "Confirm"
                            : isDowngrade
                              ? "Confirm downgrade"
                              : "Confirm upgrade"}
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
                    {loading === tier.id ? "Redirecting…" : "Subscribe"}
                  </button>
                ) : (
                  // A real upgrade, a downgrade, or a reactivation (same
                  // tier, currently canceling or mid-downgrade) — all three
                  // go through the confirm step and change-plan, which
                  // branches on price vs. rank to do the right Stripe-side
                  // thing.
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
                    {isDowngrade
                      ? "Downgrade"
                      : showsAsSubscribe
                        ? "Subscribe"
                        : "Upgrade"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-accent">{error}</p>}

      <p className="text-center text-xs text-ink-muted">{GST_NOTE}</p>
    </div>
  );
}
