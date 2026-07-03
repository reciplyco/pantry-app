import Link from "next/link";

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

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl font-medium tracking-tight">
          Reciply
        </span>
        <nav className="flex items-center gap-5 text-sm">
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

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="grid flex-1 items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              No more &ldquo;what&rsquo;s for dinner&rdquo;
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] font-medium tracking-tight text-ink md:text-6xl">
              Cook what&rsquo;s already in your kitchen.
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-muted">
              List the ingredients you have on hand. Reciply turns them into
              recipes, a shopping list for anything missing, and a weekly
              meal plan — automatically.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
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
              Free — 3 recipe generations / week. Upgrade any time.
            </p>
          </div>

          <div className="paper-card -rotate-1 rounded-sm p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              Tonight&rsquo;s pantry
            </p>
            <ul className="mt-3 space-y-1 font-mono text-sm text-ink">
              <li>— chickpeas (1 can)</li>
              <li>— spinach</li>
              <li>— garlic</li>
              <li>— rice</li>
              <li>— lemon</li>
            </ul>
            <div className="my-4 border-t border-dashed border-line" />
            <p className="font-serif text-xl font-medium">
              Lemony Chickpea &amp; Spinach Rice
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              25 min · 2 servings · 410 cal
            </p>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.tag} className="paper-card rounded-sm p-5">
              <span className="font-mono text-xs text-accent">{f.tag}</span>
              <h3 className="mt-2 font-serif text-lg font-medium">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line px-6 py-6 text-center font-mono text-xs text-ink-muted">
        Reciply
      </footer>
    </div>
  );
}
