import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
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

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium">Billing</h1>
      <p className="mt-2 text-ink-muted">
        Manage your Reciply plan and payment details.
      </p>
      <BillingPanel
        subscriptionStatus={profile?.subscription_status ?? "free"}
        subscriptionCurrentPeriodEnd={
          profile?.subscription_current_period_end ?? null
        }
      />
    </div>
  );
}
