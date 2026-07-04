import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type Props = {
  isPro: boolean;
  tabs?: React.ReactNode;
};

export default function AppHeader({ isPro, tabs }: Props) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href="/app"
          className="font-serif text-2xl font-medium tracking-tight sm:text-3xl"
        >
          Reciply
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
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
      </div>
      {tabs && (
        <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 sm:pb-5">
          {tabs}
        </div>
      )}
    </header>
  );
}
