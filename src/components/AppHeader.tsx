import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { getTier } from "@/lib/pricing";
import type { SubscriptionTier } from "@/lib/types";

type Props = {
  tierId: SubscriptionTier;
  tabs?: React.ReactNode;
};

export default function AppHeader({ tierId, tabs }: Props) {
  const tier = getTier(tierId);
  const isFree = tierId === "discovery";

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
          isFree
            ? "border border-accent-ink/30 text-accent-ink/80"
            : "bg-sage text-sage-ink"
        }`}
      >
        {tier.name}
      </span>
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
