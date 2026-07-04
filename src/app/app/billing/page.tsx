import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { effectiveTierId } from "@/lib/pricing";
import AppHeader from "@/components/AppHeader";
import BillingPanel from "@/components/dashboard/BillingPanel";

export default async function BillingPage() {
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

  const subscriptionStatus = profile?.subscription_status ?? "free";
  const currentTierId = effectiveTierId(
    subscriptionStatus,
    profile?.subscription_tier
  );

  return (
    <>
      <AppHeader tierId={currentTierId} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-serif text-3xl font-medium">Billing</h1>
        <p className="mt-2 text-ink-muted">
          Manage your Reciply plan and payment details.
        </p>
        <BillingPanel
          currentTierId={currentTierId}
          subscriptionStatus={subscriptionStatus}
          subscriptionCurrentPeriodEnd={
            profile?.subscription_current_period_end ?? null
          }
        />
      </main>
    </>
  );
}
