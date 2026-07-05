import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { getTier } from "@/lib/pricing";
import type { PendingScheduledChange } from "@/lib/stripe";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/types";

type Props = {
  tierId: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string | null;
  pendingChange?: PendingScheduledChange | null;
  tabs?: React.ReactNode;
};

// Pinned to UTC so this always agrees with the same date shown elsewhere
// (e.g. AccountPanel/BillingPanel) regardless of whether this component
// happens to render on the server (Vercel's timezone) or the client (the
// visitor's local timezone) — those can disagree by a day otherwise, since
// Stripe's period-end timestamps aren't always safely far from midnight UTC.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function AppHeader({
  tierId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd,
  pendingChange,
  tabs,
}: Props) {
  const tier = getTier(tierId);
  const discoveryName = getTier("discovery").name;
  const isFree = tierId === "discovery";
  // effectiveTierId keeps a canceled subscriber's old tier active (features,
  // generation caps, etc.) right up until the period actually ends — so the
  // badge would otherwise just say "PRO" with no hint anything's changed.
  // Same idea for a scheduled downgrade to another paid tier (pendingChange)
  // — the real entitlement doesn't change until it takes effect, so show
  // whichever tier the customer is headed to, plus a reminder of what
  // they're still keeping and until when. Canceling to Discovery wins if
  // somehow both are set.
  const isCanceling = subscriptionStatus === "canceled" && !isFree;
  const displayName = isCanceling
    ? discoveryName
    : pendingChange
      ? getTier(pendingChange.tier).name
      : tier.name;
  const keepingUntil = isCanceling
    ? subscriptionCurrentPeriodEnd
    : (pendingChange?.effectiveDate ?? null);

  const logo = (
    <Link
      href="/app"
      className="flex shrink-0 items-center gap-2 font-serif text-2xl font-medium tracking-tight text-accent-ink sm:text-3xl"
    >
      <Image src="/logo-mark.png" alt="" width={32} height={36} className="h-8 w-auto sm:h-9" />
      Reciply
    </Link>
  );

  const accountLinks = (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
      <span
        className={`whitespace-nowrap rounded-full px-3 py-1 font-mono text-xs uppercase tracking-widest ${
          isFree || isCanceling
            ? "border border-accent-ink/30 text-accent-ink/80"
            : "bg-sage text-sage-ink"
        }`}
      >
        {displayName}
      </span>
      {(isCanceling || pendingChange) && keepingUntil && (
        <span className="whitespace-nowrap text-xs text-accent-ink/60">
          Keeping {tier.name} until {formatDate(keepingUntil)}
        </span>
      )}
      <Link
        href="/app/billing"
        className="whitespace-nowrap text-sm text-accent-ink/75 transition hover:text-accent-ink"
      >
        Billing
      </Link>
      <Link
        href="/app/account"
        className="whitespace-nowrap text-sm text-accent-ink/75 transition hover:text-accent-ink"
      >
        Account
      </Link>
      <SignOutButton />
    </div>
  );

  return (
    <header className="bg-header">
      {/* Tabs get their own full-width row at every breakpoint — sharing
          a row with the logo and account links left too little room for
          six tabs, so the last one or two scrolled out of view with no
          visible way to reach them. */}
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {logo}
          {accountLinks}
        </div>
        {tabs && <div className="mt-4">{tabs}</div>}
      </div>
    </header>
  );
}
