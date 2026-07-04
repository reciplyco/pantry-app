"use client";

import { useEffect, useState } from "react";

export type ToastState = {
  id: number;
  message: string;
  onUndo?: () => void;
};

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
};

const EXIT_DURATION = 200;

export default function Toast({ toast, onDismiss }: Props) {
  const [displayed, setDisplayed] = useState<ToastState | null>(toast);
  const [enterVisible, setEnterVisible] = useState(false);
  const [trackedId, setTrackedId] = useState<number | null>(toast?.id ?? null);

  // Adjust state during render when a new toast prop arrives, per React's
  // guidance for mirroring a changed prop into state — avoids the extra
  // render pass (and lint violation) an effect-based sync would cause.
  if (toast && toast.id !== trackedId) {
    setTrackedId(toast.id);
    setDisplayed(toast);
    setEnterVisible(false);
  }

  // Once toast goes null, it's not visible regardless of the lingering
  // enter-animation flag — no separate state needed for the exit case.
  const visible = toast !== null && enterVisible;

  useEffect(() => {
    if (toast) {
      // Defer to the next frame so the enter transition actually plays
      // instead of mounting already at its end state.
      const raf = requestAnimationFrame(() => setEnterVisible(true));
      const timer = setTimeout(onDismiss, 5000);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
    const timer = setTimeout(() => setDisplayed(null), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!displayed) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-4 rounded-full border border-line bg-card px-5 py-2.5 text-sm shadow-lg">
        <span>{displayed.message}</span>
        {displayed.onUndo && (
          <button
            type="button"
            onClick={() => {
              displayed.onUndo?.();
              onDismiss();
            }}
            className="font-medium text-accent underline underline-offset-2 transition active:scale-95"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
