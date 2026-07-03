"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-paper px-6 text-center text-ink">
        <p className="font-serif text-2xl font-medium">
          Something went wrong.
        </p>
        <p className="mt-2 text-ink-muted">
          We&rsquo;ve been notified and are looking into it.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink transition hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
