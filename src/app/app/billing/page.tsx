import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import {
  effectiveTierId,
  PAID_TIER_IDS,
  type BillingPeriod,
  type PaidTierId,
} from "@/lib/pricing";
import { getActiveSubscription, getPendingScheduledChange } from "@/lib/stripe";
import AppHeader from "@/components/AppHeader";
import BillingPanel from "@/components/dashboard/BillingPanel";

export default async function BillingPage({
  searchParams,
}: PageProps<"/app/billing">) {
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

  // A visitor who picked a plan on the marketing pricing section before
  // signing up arrives here with ?autocheckout=&period= — see LoginForm.tsx
  // and auth/callback/route.ts for how it survives the sign-up/sign-in hop.
  const { autocheckout, period } = await searchParams;
  const autocheckoutTier: PaidTierId | null =
    typeof autocheckout === "string" &&
    (PAID_TIER_IDS as string[]).includes(autocheckout)
      ? (autocheckout as PaidTierId)
      : null;
  const autocheckoutPeriod: BillingPeriod = period === "yearly" ? "yearly" : "monthly";

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
          pendingChange={pendingChange}
          autocheckoutTier={autocheckoutTier}
          autocheckoutPeriod={autocheckoutPeriod}
        />
      </main>
    </>
  );
}
