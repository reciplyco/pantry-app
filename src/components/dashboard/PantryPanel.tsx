"use client";

import Link from "next/link";
import { useState } from "react";
import type { PantryItem } from "@/lib/types";

type Props = {
  pantryItems: PantryItem[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onGenerate: () => Promise<void>;
  generating: boolean;
  generateError: string | null;
  isPro: boolean;
  remaining: number;
  freeTierWeeklyLimit: number;
};

export default function PantryPanel({
  pantryItems,
  onAdd,
  onRemove,
  onGenerate,
  generating,
  generateError,
  isPro,
  remaining,
  freeTierWeeklyLimit,
}: Props) {
  const [input, setInput] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input;
    setInput("");
    await onAdd(value);
  }

  const isCapped = !isPro && remaining <= 0;

  return (
    <section className="paper-card rounded-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium">Your pantry</h1>
          <p className="mt-1 text-sm text-ink-muted">
            List what you&rsquo;ve got, then generate recipes built around it.
          </p>
        </div>
        <div className="text-right font-mono text-xs text-ink-muted">
          {isPro ? (
            <span className="text-sage">Unlimited generations</span>
          ) : (
            <span className={isCapped ? "text-accent" : undefined}>
              {remaining} / {freeTierWeeklyLimit} free generations left this
              week
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. chickpeas, spinach, garlic"
          className="flex-1 rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-ink"
        >
          Add
        </button>
      </form>

      {pantryItems.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {pantryItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-full border border-line bg-paper-alt px-3 py-1 text-sm"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name}`}
                className="text-ink-muted transition hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Nothing in your pantry yet — add a few ingredients to get started.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || isCapped}
          className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Cooking up ideas…" : "Generate recipes"}
        </button>
        {isCapped && (
          <Link
            href="/app/billing"
            className="text-sm font-medium text-accent underline underline-offset-2"
          >
            Upgrade to Pro for unlimited recipes →
          </Link>
        )}
        {generateError && !isCapped && (
          <p className="text-sm text-accent">{generateError}</p>
        )}
      </div>
      {isCapped && generateError && (
        <p className="mt-2 text-sm text-ink-muted">{generateError}</p>
      )}
    </section>
  );
}
