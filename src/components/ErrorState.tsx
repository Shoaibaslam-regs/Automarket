"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/** Shared fallback UI for the route-group error.tsx boundaries. */
export default function ErrorState({
  error,
  retry,
  homeHref = "/home",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_20px_44px_-24px_rgba(15,23,42,0.25)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-100">
          <AlertTriangle size={26} strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We hit an unexpected problem loading this page. It&apos;s usually temporary, so please try again.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[11px] text-slate-400">Ref: {error.digest}</p>}
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RotateCcw size={15} strokeWidth={2} />
            Try again
          </button>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
