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
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link
            href="/app"
            className="font-serif text-xl font-medium tracking-tight"
          >
            Reciply
          </Link>
          <div className="flex items-center gap-4">
            <span
              className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-widest ${
                isPro
                  ? "bg-sage text-sage-ink"
                  : "border border-line text-ink-muted"
              }`}
            >
              {isPro ? "Pro" : "Free"}
            </span>
            <Link
              href="/app/billing"
              className="text-sm text-ink-muted transition hover:text-ink"
            >
              Billing
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
