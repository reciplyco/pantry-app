"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIERS, getTier, tierRank, type PaidTierId } from "@/lib/pricing";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/types";
import type { PendingScheduledChange } from "@/lib/stripe";

type Props = {
  currentTierId: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  pendingChange: PendingScheduledChange | null;
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

export default function AccountPanel({
  currentTierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  pendingChange,
}: Props) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [portalLoading, setPortalLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [confirmingDowngrade, setConfirmingDowngrade] =
    useState<PaidTierId | null>(null);
  const [changingPlan, setChangingPlan] = useState<PaidTierId | null>(null);
  const [downgradeResult, setDowngradeResult] = useState<{
    tierName: string;
    effectiveDate: string;
  } | null>(null);

  const currentTier = getTier(currentTierId);
  const discoveryName = getTier("discovery").name;
  const periodEndLabel = subscriptionCurrentPeriodEnd
    ? formatDate(subscriptionCurrentPeriodEnd)
    : null;
  const downgradeTargets = TIERS.filter(
    (t) => t.id !== "discovery" && tierRank(t.id) < tierRank(currentTierId)
  );

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordSuccess(true);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Couldn't delete your account.");
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setSubError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.url) {
        setSubError(body.error ?? "Couldn't open billing portal.");
        setPortalLoading(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setSubError("Couldn't open billing portal.");
      setPortalLoading(false);
    }
  }

  async function downgradeTo(tierId: PaidTierId) {
    setChangingPlan(tierId);
    setSubError(null);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, period: "monthly" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubError(body.error ?? "Couldn't change your plan. Try again.");
        setChangingPlan(null);
        return;
      }
      setDowngradeResult({
        tierName: getTier(tierId).name,
        effectiveDate: body.effectiveDate,
      });
      setConfirmingDowngrade(null);
      setChangingPlan(null);
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setSubError("Couldn't change your plan. Try again.");
      setChangingPlan(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Subscription</h2>

        {currentTierId === "discovery" ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              You&rsquo;re on the free Discovery plan.
            </p>
            <Link
              href="/app/billing"
              className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
            >
              See paid plans →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {subscriptionStatus === "canceled" ? (
                <>You&rsquo;re on the {discoveryName} plan.</>
              ) : pendingChange ? (
                <>You&rsquo;re on the {getTier(pendingChange.tier).name} plan.</>
              ) : (
                <>You&rsquo;re on the {currentTier.name} plan.</>
              )}
            </p>

            {subscriptionStatus === "past_due" && (
              <p className="mt-2 text-sm text-accent">
                We couldn&rsquo;t charge your card. Update your payment
                method to keep your plan&rsquo;s features.
              </p>
            )}
            {subscriptionStatus === "canceled" && periodEndLabel && (
              <p className="mt-2 text-sm text-ink-muted">
                Your {currentTier.name}{" "}plan is canceled, but
                you&rsquo;ll keep its features —{" "}
                {currentTier.generationsPerMonth}{" "}AI generations/month
                and everything else — until {periodEndLabel}. After that,
                it&rsquo;s the {discoveryName}{" "}plan from here.
              </p>
            )}
            {pendingChange && (
              <p className="mt-2 text-sm text-ink">
                Your plan changes to{" "}
                <strong>{getTier(pendingChange.tier).name}</strong> on{" "}
                {formatDate(pendingChange.effectiveDate)}. You&rsquo;ll keep
                every {currentTier.name} feature and benefit until then.
              </p>
            )}
            {downgradeResult && !pendingChange && (
              <p className="mt-2 text-sm text-ink">
                Got it — you&rsquo;re moving to{" "}
                <strong>{downgradeResult.tierName}</strong> on{" "}
                {formatDate(downgradeResult.effectiveDate)}. You&rsquo;ll
                keep all your current plan&rsquo;s features until then.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={portalLoading}
                onClick={openPortal}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
              >
                {portalLoading ? "Opening…" : "Manage subscription"}
              </button>
              <Link
                href="/app/billing"
                className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
              >
                See all plans
              </Link>
            </div>

            {downgradeTargets.length > 0 && (
              <div className="mt-5">
                <p className="text-sm text-ink-muted">Downgrade to:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {downgradeTargets.map((tier) => {
                    const isPendingThis =
                      pendingChange?.tier === tier.id;
                    const isConfirming = confirmingDowngrade === tier.id;

                    if (isPendingThis) {
                      return (
                        <span
                          key={tier.id}
                          className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-muted"
                        >
                          {tier.name} scheduled
                        </span>
                      );
                    }

                    if (isConfirming) {
                      return (
                        <div
                          key={tier.id}
                          className="w-full space-y-2 rounded-sm border border-line bg-paper-alt p-3"
                        >
                          <p className="text-xs text-ink-muted">
                            Won&rsquo;t take effect until your billing
                            period ends
                            {periodEndLabel ? ` on ${periodEndLabel}` : ""}.
                            You&rsquo;ll keep every {currentTier.name}{" "}
                            feature until then — nothing changes today.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={changingPlan !== null}
                              onClick={() => downgradeTo(tier.id as PaidTierId)}
                              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {changingPlan === tier.id
                                ? "Working…"
                                : `Confirm downgrade to ${tier.name}`}
                            </button>
                            <button
                              type="button"
                              disabled={changingPlan !== null}
                              onClick={() => setConfirmingDowngrade(null)}
                              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-ink disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() =>
                          setConfirmingDowngrade(tier.id as PaidTierId)
                        }
                        className="rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-ink"
                      >
                        {tier.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {subError && <p className="mt-3 text-sm text-accent">{subError}</p>}
          </>
        )}
      </div>

      <div className="paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 max-w-sm space-y-3">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm text-ink-muted">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm text-ink-muted">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          {passwordError && <p className="text-sm text-accent">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm text-sage">Password updated.</p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
          >
            {passwordSaving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>

      <div className="paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Your data</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Download everything Reciply has stored for you — pantry, recipes,
          shopping list, and meal plan — as a JSON file.
        </p>
        <a
          href="/api/account/export"
          className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
        >
          Export my data
        </a>
      </div>

      <div className="paper-card rounded-sm border-accent/40 p-6">
        <h2 className="font-serif text-xl font-medium text-accent">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          This permanently deletes your account and all of your data —
          pantry, recipes, shopping list, meal plan, and billing history.
          This can&rsquo;t be undone.
        </p>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-full border border-accent px-5 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-accent-ink"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 max-w-sm space-y-3">
            <label htmlFor="delete-confirm" className="block text-sm text-ink-muted">
              Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
            {deleteError && <p className="text-sm text-accent">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleteInput !== "DELETE" || deleting}
                onClick={handleDelete}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
