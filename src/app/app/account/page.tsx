import { createClient } from "@/lib/supabase/server";
import AccountPanel from "@/components/dashboard/AccountPanel";
import DietaryPreferencesPanel from "@/components/dashboard/DietaryPreferencesPanel";
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

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium">Account</h1>
      <p className="mt-2 text-ink-muted">{user.email}</p>
      <DietaryPreferencesPanel
        initialPreferences={profile?.dietary_preferences ?? []}
        initialNotes={profile?.dietary_notes ?? ""}
      />
      <AccountPanel />
    </div>
  );
}
