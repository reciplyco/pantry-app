"use client";

import { useEffect } from "react";

export type ToastState = {
  id: number;
  message: string;
  onUndo?: () => void;
};

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export default function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-full border border-line bg-card px-5 py-2.5 text-sm shadow-lg">
        <span>{toast.message}</span>
        {toast.onUndo && (
          <button
            type="button"
            onClick={() => {
              toast.onUndo?.();
              onDismiss();
            }}
            className="font-medium text-accent underline underline-offset-2"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
