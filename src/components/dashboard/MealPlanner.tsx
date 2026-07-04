"use client";

import { useState } from "react";
import { DAYS, DAY_LABELS, type MealPlanEntryWithRecipe } from "@/lib/types";
import { addDays, formatShortDate } from "@/lib/dates";

type Props = {
  weekStartDate: string;
  entries: MealPlanEntryWithRecipe[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onRemoveEntry: (id: string) => Promise<void>;
  onShopForWeek: () => Promise<void>;
};

export default function MealPlanner({
  weekStartDate,
  entries,
  onPrevWeek,
  onNextWeek,
  onRemoveEntry,
  onShopForWeek,
}: Props) {
  const [shopping, setShopping] = useState(false);
  const monday = new Date(`${weekStartDate}T00:00:00`);
  const sunday = addDays(monday, 6);

  async function handleShopForWeek() {
    setShopping(true);
    await onShopForWeek();
    setShopping(false);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-medium">Meal planner</h2>
        <div className="flex items-center gap-3 font-mono text-xs text-ink-muted">
          <button
            type="button"
            onClick={onPrevWeek}
            aria-label="Previous week"
            className="rounded-full border border-line px-2 py-1 transition hover:border-ink active:scale-90"
          >
            ‹
          </button>
          <span>
            {formatShortDate(monday)} – {formatShortDate(sunday)}
          </span>
          <button
            type="button"
            onClick={onNextWeek}
            aria-label="Next week"
            className="rounded-full border border-line px-2 py-1 transition hover:border-ink active:scale-90"
          >
            ›
          </button>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            disabled={shopping}
            onClick={handleShopForWeek}
            className="rounded-full bg-sage px-4 py-1.5 text-sm font-medium text-sage-ink transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50"
          >
            {shopping ? "Adding…" : "Shop for the week"}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {DAYS.map((day) => {
          const dayEntries = entries.filter((e) => e.day === day);
          return (
            <div
              key={day}
              className="rounded-sm border border-line bg-card p-3 shadow-sm"
            >
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                {DAY_LABELS[day].slice(0, 3)}
              </p>
              <div className="mt-2 space-y-2">
                {dayEntries.length === 0 && (
                  <p className="text-xs text-ink-muted">—</p>
                )}
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="anim-fade-in-up rounded-sm border border-line bg-paper-alt px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="leading-snug">
                        {entry.recipe?.title ?? "Deleted recipe"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveEntry(entry.id)}
                        aria-label="Remove from plan"
                        className="shrink-0 text-ink-muted transition hover:text-accent active:scale-90"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
