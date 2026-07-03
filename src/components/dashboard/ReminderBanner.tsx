"use client";

import { useState, useSyncExternalStore } from "react";

type Props = {
  weekStartDate: string;
  isCurrentWeek: boolean;
  hasMealPlanEntries: boolean;
};

function dismissKey(weekStartDate: string) {
  return `reciply_reminder_dismissed_${weekStartDate}`;
}

export default function ReminderBanner({
  weekStartDate,
  isCurrentWeek,
  hasMealPlanEntries,
}: Props) {
  const subscribe = () => () => {};
  const getSnapshot = () =>
    localStorage.getItem(dismissKey(weekStartDate)) === "1";
  const getServerSnapshot = () => true;

  const persistedDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [sessionDismissed, setSessionDismissed] = useState(false);

  if (
    !isCurrentWeek ||
    hasMealPlanEntries ||
    persistedDismissed ||
    sessionDismissed
  ) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(dismissKey(weekStartDate), "1");
    setSessionDismissed(true);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border border-line bg-paper-alt px-4 py-3 text-sm">
      <span>
        You haven&rsquo;t planned any meals for this week yet — add a recipe
        to your planner below.
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-ink-muted transition hover:text-ink"
      >
        Dismiss
      </button>
    </div>
  );
}
