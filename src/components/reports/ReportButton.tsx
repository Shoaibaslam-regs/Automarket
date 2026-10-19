"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Flag, X } from "lucide-react";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";
import { useRateLock } from "@/hooks/useRateLock";

/**
 * Small "Report" link that opens a dialog to report a listing, deal or business to the admins.
 * Pass `hidden` for the item's own seller or business team. Signed-out visitors are sent to sign in.
 */
export default function ReportButton({ targetType, targetId, label, hidden, className = "", tone = "light" }: {
  targetType: "LISTING" | "DEAL" | "BUSINESS";
  targetId: string;
  /** What's being reported, for the dialog title, e.g. the listing title */
  label: string;
  hidden?: boolean;
  className?: string;
  /** "dark" for dark headers like the dealer page */
  tone?: "light" | "dark";
}) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const lock = useRateLock("reports");

  if (hidden) return null;
  const linkCls = `inline-flex items-center gap-1.5 text-xs font-medium transition ${tone === "dark" ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-rose-600"} ${className}`;
  const noun = targetType === "LISTING" ? "listing" : targetType === "DEAL" ? "deal" : "business";

  if (status !== "authenticated") {
    return <Link href="/login" className={linkCls}><Flag size={13} /> Report this {noun}</Link>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Choose what's wrong"); return; }
    setSending(true);
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, details }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    lock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't send your report"); return; }
    setSent(true);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!sending) { setOpen(o); if (!o) { setSent(false); setError(""); } } }}>
      <Dialog.Trigger asChild>
        <button type="button" className={linkCls}><Flag size={13} /> Report this {noun}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex flex-shrink-0 items-center justify-center text-rose-600"><Flag size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">{sent ? "Thanks for telling us" : `Report this ${noun}`}</Dialog.Title>
              <Dialog.Description className="mt-1 truncate text-sm text-slate-500">{label}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          {sent ? (
            <div className="mt-5 space-y-4">
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <CheckCircle2 size={18} className="mt-px flex-shrink-0" />
                Our team will review it. The {noun === "business" ? "business" : "seller"} isn&apos;t told who reported it.
              </p>
              <Dialog.Close asChild>
                <button type="button" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Done</button>
              </Dialog.Close>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div role="radiogroup" aria-label="What's wrong" className="space-y-1.5">
                {REPORT_REASONS.map(r => (
                  <button key={r.id} type="button" role="radio" aria-checked={reason === r.id} onClick={() => { setReason(r.id); setError(""); }}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${reason === r.id ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${reason === r.id ? "border-[5px] border-slate-900" : "border-slate-300"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{r.label}</span>
                      <span className="block text-xs text-slate-500">{r.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} maxLength={1000}
                placeholder={reason === "OTHER" ? "Tell us what's wrong (required)" : "Anything else we should know? (optional)"} aria-label="Details"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
              <button type="submit" disabled={sending || lock.locked} className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                {lock.locked ? lock.text : sending ? "Sending…" : "Send report"}
              </button>
              <p className="text-center text-[11px] text-slate-400">Reports are private. False reports may lead to your account being limited.</p>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
