import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`account-delete:${user.id}`, 3, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a while and try again." },
      { status: 429 }
    );
  }

  // Deleting the auth.users row cascades to profiles (and from there to
  // every table referencing profiles.id) via the FKs set up in the schema.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Failed to delete user", error);
    return NextResponse.json(
      { error: "Couldn't delete your account. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
