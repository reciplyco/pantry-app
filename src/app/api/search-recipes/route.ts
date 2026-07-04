import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchRecipes } from "@/lib/spoonacular";

const requestSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  maxTime: z.number().int().positive().max(600).optional(),
  cuisines: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  methods: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  diets: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`search-recipes:${user.id}`, 20, 300);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a few minutes and try again." },
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

  if (!process.env.SPOONACULAR_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Recipe search isn't configured yet — ask the site owner to add a Spoonacular API key.",
      },
      { status: 503 }
    );
  }

  try {
    const results = await searchRecipes(parsed.data);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Recipe search failed", err);
    return NextResponse.json(
      { error: "Recipe search failed. Please try again." },
      { status: 502 }
    );
  }
}
