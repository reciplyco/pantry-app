"use client";

import { useState, useSyncExternalStore } from "react";

const DISMISS_KEY = "reciply_onboarding_dismissed";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return localStorage.getItem(DISMISS_KEY) === "1";
}

function getServerSnapshot() {
  return true;
}

type Props = {
  hasPantryItems: boolean;
  hasRecipes: boolean;
  hasShoppingListItems: boolean;
  hasMealPlanEntries: boolean;
};

export default function OnboardingChecklist({
  hasPantryItems,
  hasRecipes,
  hasShoppingListItems,
  hasMealPlanEntries,
}: Props) {
  const persistedDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const dismissed = persistedDismissed || sessionDismissed;

  const steps = [
    { label: "Add a few pantry items", done: hasPantryItems },
    { label: "Generate your first recipes", done: hasRecipes },
    { label: "Add missing ingredients to your shopping list", done: hasShoppingListItems },
    { label: "Plan a recipe onto your week", done: hasMealPlanEntries },
  ];

  const allDone = steps.every((s) => s.done);

  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setSessionDismissed(true);
  }

  return (
    <section className="paper-card rounded-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-lg font-medium">Getting started</h2>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-ink-muted transition hover:text-ink"
        >
          Hide
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                step.done
                  ? "border-sage bg-sage text-sage-ink"
                  : "border-line text-transparent"
              }`}
            >
              ✓
            </span>
            <span className={step.done ? "text-ink-muted line-through" : "text-ink"}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
