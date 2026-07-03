import { createClient } from "@/lib/supabase/server";
import AccountPanel from "@/components/dashboard/AccountPanel";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium">Account</h1>
      <p className="mt-2 text-ink-muted">{user.email}</p>
      <AccountPanel />
    </div>
  );
}
