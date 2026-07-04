import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import type { Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const isPro = profile?.subscription_status === "active";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
