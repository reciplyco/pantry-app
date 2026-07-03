"use client";

import { useState } from "react";
import { AnalyticsEvent, track } from "@/lib/analytics";
import type { SubscriptionStatus } from "@/lib/types";

type Props = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
};

export default function BillingPanel({
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
}: Props) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | "portal" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function upgrade(plan: "monthly" | "yearly") {
    setLoading(plan);
    setError(null);
    track(AnalyticsEvent.UpgradeClicked, { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setError(body.error ?? "Couldn't start checkout. Try again.");
        setLoading(null);
        return;
      }
      window.location.href = body.url;
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
      window.location.href = body.url;
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
      <div className="paper-card rounded-sm p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Current plan
        </p>
        <p className="mt-1 font-serif text-2xl font-medium">
          {subscriptionStatus === "active" && "Pro"}
          {subscriptionStatus === "past_due" && "Pro (payment past due)"}
          {subscriptionStatus === "canceled" && "Pro (canceled)"}
          {subscriptionStatus === "free" && "Free"}
        </p>

        {subscriptionStatus === "active" && periodEndLabel && (
          <p className="mt-1 text-sm text-ink-muted">
            Renews {periodEndLabel}
          </p>
        )}
        {subscriptionStatus === "past_due" && (
          <p className="mt-1 text-sm text-accent">
            We couldn&rsquo;t charge your card. Update your payment method to
            keep Pro access.
          </p>
        )}
        {subscriptionStatus === "canceled" && periodEndLabel && (
          <p className="mt-1 text-sm text-ink-muted">
            Access ends {periodEndLabel}
          </p>
        )}
        {subscriptionStatus === "free" && (
          <p className="mt-1 text-sm text-ink-muted">
            3 recipe generations per week. Upgrade for unlimited.
          </p>
        )}

        {subscriptionStatus !== "free" && (
          <button
            type="button"
            onClick={openPortal}
            disabled={loading === "portal"}
            className="mt-4 rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
          >
            {loading === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </div>

      {(subscriptionStatus === "free" || subscriptionStatus === "canceled") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="paper-card rounded-sm p-6">
            <p className="font-serif text-xl font-medium">Monthly</p>
            <p className="mt-1 text-2xl font-medium">
              $6.99<span className="text-sm text-ink-muted"> / month</span>
            </p>
            <button
              type="button"
              onClick={() => upgrade("monthly")}
              disabled={loading !== null}
              className="mt-4 w-full rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {loading === "monthly" ? "Redirecting…" : "Upgrade monthly"}
            </button>
          </div>
          <div className="paper-card rounded-sm p-6">
            <p className="font-serif text-xl font-medium">Yearly</p>
            <p className="mt-1 text-2xl font-medium">
              $59<span className="text-sm text-ink-muted"> / year</span>
            </p>
            <p className="mt-1 text-xs text-sage">Save ~30% vs monthly</p>
            <button
              type="button"
              onClick={() => upgrade("yearly")}
              disabled={loading !== null}
              className="mt-4 w-full rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {loading === "yearly" ? "Redirecting…" : "Upgrade yearly"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
