import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { effectiveTierId } from "@/lib/pricing";
import { getActiveSubscription, getPendingScheduledChange } from "@/lib/stripe";
import AppHeader from "@/components/AppHeader";
import BillingPanel from "@/components/dashboard/BillingPanel";

// The Billing tab only shows the current plan and upgrades from it — this
// page is the "see every plan" destination linked from Account's "See all
// plans", the same comprehensive view the signed-out marketing pricing
// section shows, just for an already-signed-in customer.
export default async function PlansPage() {
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
  const currentTierId = effectiveTierId(subscriptionStatus, profile?.subscription_tier);

  const pendingChange =
    subscriptionStatus === "active" && profile?.stripe_customer_id
      ? await getActiveSubscription(profile.stripe_customer_id).then((sub) =>
          sub ? getPendingScheduledChange(sub) : null
        )
      : null;

  return (
    <>
      <AppHeader
        tierId={currentTierId}
        subscriptionStatus={subscriptionStatus}
        subscriptionCurrentPeriodEnd={
          profile?.subscription_current_period_end ?? null
        }
        pendingChange={pendingChange}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-serif text-3xl font-medium">All plans</h1>
        <p className="mt-2 text-ink-muted">
          Every Reciply plan, whatever you&rsquo;re on today.
        </p>
        <BillingPanel
          currentTierId={currentTierId}
          subscriptionStatus={subscriptionStatus}
          subscriptionCurrentPeriodEnd={
            profile?.subscription_current_period_end ?? null
          }
          pendingChange={pendingChange}
          autocheckoutTier={null}
          autocheckoutPeriod="monthly"
          showAllTiers
        />
      </main>
    </>
  );
}
