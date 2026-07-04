import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type Props = {
  isPro: boolean;
  tabs?: React.ReactNode;
};

export default function AppHeader({ isPro, tabs }: Props) {
  const logo = (
    <Link
      href="/app"
      className="shrink-0 font-serif text-2xl font-medium tracking-tight sm:text-3xl"
    >
      Reciply
    </Link>
  );

  const accountLinks = (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
      <span
        className={`whitespace-nowrap rounded-full px-3 py-1 font-mono text-xs uppercase tracking-widest ${
          isPro
            ? "bg-sage text-sage-ink"
            : "border border-line text-ink-muted"
        }`}
      >
        {isPro ? "Pro" : "Free"}
      </span>
      <Link
        href="/app/billing"
        className="whitespace-nowrap text-sm text-ink-muted transition hover:text-ink"
      >
        Billing
      </Link>
      <Link
        href="/app/account"
        className="whitespace-nowrap text-sm text-ink-muted transition hover:text-ink"
      >
        Account
      </Link>
      <SignOutButton />
    </div>
  );

  return (
    <header className="border-b border-line">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Below `sm`, there isn't room for the logo, tabs, and account
            links on one line — logo/account share the top line and the
            tab bar gets its own full-width line beneath. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:hidden">
          {logo}
          {accountLinks}
        </div>
        {tabs && <div className="mt-3 sm:hidden">{tabs}</div>}

        {/* At `sm` and up there's enough width to keep everything on a
            single row, with the tab bar scrolling internally if needed. */}
        <div className="hidden items-center gap-4 sm:flex sm:gap-6">
          {logo}
          {tabs && <div className="min-w-0 flex-1">{tabs}</div>}
          {accountLinks}
        </div>
      </div>
    </header>
  );
}
