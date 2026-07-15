import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTier } from "@/lib/pricing";
import GenerateShowcase from "@/components/marketing/GenerateShowcase";
import MarketingPricing from "@/components/marketing/MarketingPricing";
import HeroSceneLoader from "@/components/marketing/HeroSceneLoader";
import IngredientMarquee from "@/components/marketing/IngredientMarquee";
import SmoothScroll from "@/components/marketing/SmoothScroll";
import CustomCursor from "@/components/marketing/CustomCursor";
import GrainOverlay from "@/components/marketing/GrainOverlay";
import Reveal from "@/components/marketing/Reveal";

const discoveryTier = getTier("discovery");

const FEATURES = [
  {
    tag: "01",
    title: "Tell us what you have",
    body: "Type in whatever's in your fridge and pantry — no exact measurements needed.",
  },
  {
    tag: "02",
    title: "Get recipes back",
    body: "AI suggests recipes built around what you already own, with steps and nutrition estimates.",
  },
  {
    tag: "03",
    title: "Shop for the rest",
    body: "Missing ingredients land on a receipt-style shopping list, ready to check off.",
  },
  {
    tag: "04",
    title: "Plan the week",
    body: "Drop recipes onto a weekly planner so dinner stops being a daily decision.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-full flex-col">
      <SmoothScroll />
      <CustomCursor />
      <GrainOverlay />
      <div className="relative overflow-hidden bg-hero">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem]"
          viewBox="0 0 400 400"
        >
          <defs>
            <filter id="heroBlobA" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="40" />
            </filter>
          </defs>
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="var(--sage)"
            opacity="0.16"
            filter="url(#heroBlobA)"
          />
        </svg>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80"
          viewBox="0 0 300 300"
        >
          <defs>
            <filter id="heroBlobB" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="36" />
            </filter>
          </defs>
          <circle
            cx="150"
            cy="150"
            r="120"
            fill="var(--accent)"
            opacity="0.12"
            filter="url(#heroBlobB)"
          />
        </svg>

        <HeroSceneLoader />

        <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-2 font-serif text-2xl font-medium tracking-tight sm:text-4xl">
            <Image src="/logo-mark.png" alt="" width={36} height={41} className="h-7 w-auto sm:h-9" />
            Reciply
          </span>
          <nav className="flex items-center gap-3 text-sm sm:gap-5">
            <a
              href="#pricing"
              className="hidden text-ink-muted transition hover:text-ink sm:inline"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-ink-muted transition hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/login?tab=signup"
              className="rounded-full bg-accent px-4 py-2 font-medium text-accent-ink transition hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto w-full max-w-3xl px-6 py-16 text-center md:py-24">
          <Reveal>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              No more &ldquo;what&rsquo;s for dinner&rdquo;
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] font-medium tracking-tight text-ink md:text-6xl">
              Cook what&rsquo;s already in your kitchen.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-md text-lg text-ink-muted">
              List the ingredients you have on hand. Reciply turns them into
              recipes, a shopping list for anything missing, and a weekly
              meal plan — automatically.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login?tab=signup"
                className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition hover:opacity-90"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-line px-6 py-3 font-medium text-ink transition hover:border-ink"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 font-mono text-xs text-ink-muted">
              Free — {discoveryTier.generationsPerWeek} recipe generations / week. Upgrade any time.
            </p>
          </Reveal>
        </section>
      </div>

      <IngredientMarquee />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <GenerateShowcase />

        <section id="pricing" className="py-16">
          <Reveal>
            <MarketingPricing />
          </Reveal>
        </section>

        <section className="pb-24">
          <p className="text-center font-mono text-xs uppercase tracking-widest text-ink-muted">
            How it works
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.tag} delay={i * 0.1}>
                <div className="paper-card rounded-sm p-5">
                  <span className="font-mono text-xs text-accent">{f.tag}</span>
                  <h3 className="mt-2 font-serif text-lg font-medium">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-6 py-6 text-center font-mono text-xs text-ink-muted">
        Reciply
      </footer>
    </div>
  );
}
