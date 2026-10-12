"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Headset, ShieldAlert } from "lucide-react";

type Warning = { reason: string; at: string; open: number; total: number; canAcknowledge: boolean };

/** Amber banner for open admin warnings; the owner or a manager can acknowledge it. */
function WarningBanner({ warning }: { warning: Warning }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  async function acknowledge() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/business/warnings", { method: "PATCH" });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Couldn't acknowledge"); return; }
    setHidden(true);
    router.refresh();
  }

  return (
    <div role="alert" className="border-b border-[var(--gh-f0d97a)] bg-[var(--gh-fff8c5)] px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AlertTriangle size={18} className="flex-shrink-0 text-[var(--gh-9a6700)]" />
        <div className="min-w-0 flex-1 text-[13px] text-[var(--gh-7d4e00)]">
          <p className="font-bold">
            Warning from AutoMarket{warning.total > 1 ? ` (${warning.total} so far)` : ""} ·{" "}
            <span className="font-normal">{new Date(warning.at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
          <p className="mt-0.5">{warning.reason}. Please fix this to avoid your business being suspended.</p>
          {error && <p className="mt-1 text-[var(--gh-cf222e)]">{error}</p>}
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Link href="/business/support" className="rounded-lg border border-[var(--gh-d4a72c)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--gh-7d4e00)] hover:bg-[var(--gh-fffbe6)]">
            Contact support
          </Link>
          {warning.canAcknowledge && (
            <button onClick={acknowledge} disabled={busy} className="rounded-lg bg-[var(--gh-9a6700)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--gh-7d4e00)] disabled:opacity-50">
              {busy ? "Saving…" : "I understand"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Locks the business console while the business is suspended, leaving only Help & support
 * open so the owner can appeal, and shows a banner for open admin warnings.
 * The APIs enforce the suspension independently.
 */
export default function SuspensionGate({
  suspension,
  warning,
  children,
}: {
  suspension: { name: string; reason: string; at: string } | null;
  /** Open admin warnings: shown as a banner, nothing is locked */
  warning?: Warning | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (!suspension) {
    return (
      <>
        {warning && <WarningBanner warning={warning} />}
        {children}
      </>
    );
  }
  if (pathname.startsWith("/business/support")) return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-[var(--gh-f6f8fa)] p-4 md:min-h-screen">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--gh-ffcdd2)] bg-white text-center shadow-[0_20px_50px_-30px_rgba(207,34,46,0.45)]">
        <div className="bg-[var(--gh-fff0f0)] px-6 py-6">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gh-cf222e)] text-white"><ShieldAlert size={22} /></span>
          <h1 className="mt-3 text-lg font-bold text-[var(--gh-0d1117)]">{suspension.name} is suspended</h1>
          <p className="mt-1 text-xs text-[var(--gh-57606a)]">
            Since {new Date(suspension.at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="px-6 py-5 text-[13px] text-[var(--gh-57606a)]">
          <p className="rounded-lg bg-[var(--gh-f6f8fa)] px-3 py-2.5 text-left text-[var(--gh-24292f)]"><span className="font-semibold">Reason:</span> {suspension.reason}</p>
          <p className="mt-3">Your listings are hidden from the marketplace and your public page is offline. The console is locked until an admin reinstates the business.</p>
          <Link href="/business/support" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gh-0d1117)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gh-24292f)]">
            <Headset size={15} /> Contact support to appeal
          </Link>
          <Link href="/home" className="mt-3 block text-xs font-semibold text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">Back to the marketplace</Link>
        </div>
      </div>
    </div>
  );
}
