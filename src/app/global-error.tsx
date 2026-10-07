"use client"; // Error boundaries must be Client Components

import "./globals.css";

// Replaces the root layout when it crashes, so it must render its own <html> and <body>
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <title>Something went wrong — AutoMarket</title>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Unexpected error</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">AutoMarket hit a bump</h1>
          <p className="mt-3 max-w-md text-slate-400">
            Something broke while loading the app. Try again, and if it keeps happening come back in a few minutes.
          </p>
          {error.digest && <p className="mt-3 font-mono text-[11px] text-slate-500">Ref: {error.digest}</p>}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={unstable_retry}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Try again
            </button>
            {/* Plain <a>: a full reload is the safest recovery when the root layout is broken */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
