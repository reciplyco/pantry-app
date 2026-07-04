import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validatePantryItem } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`pantry-validate:${user.id}`, 20, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  try {
    const result = await validatePantryItem(parsed.data.name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Pantry item validation failed", err);
    // Fail open: don't let a validation-service hiccup block a core action.
    return NextResponse.json({ valid: true });
  }
}
