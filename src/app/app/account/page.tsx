import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import AccountPanel from "@/components/dashboard/AccountPanel";
import { effectiveTierId } from "@/lib/pricing";
import type { Profile } from "@/lib/types";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const currentTierId = effectiveTierId(
    profile?.subscription_status ?? "free",
    profile?.subscription_tier
  );

  return (
    <>
      <AppHeader tierId={currentTierId} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-serif text-3xl font-medium">Account</h1>
        <p className="mt-2 text-ink-muted">{user.email}</p>
        <AccountPanel />
      </main>
    </>
  );
}
