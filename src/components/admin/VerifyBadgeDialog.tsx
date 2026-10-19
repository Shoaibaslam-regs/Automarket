"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeCheck } from "lucide-react";
import { VERIFIED_BADGE, badgeState, type BadgeVerification } from "@/lib/plans";
import { fmtPlanDate } from "./PlanGiftDialog";

export type BadgeTarget = { name: string; ownerLabel?: string; verification?: BadgeVerification | null };

export type BadgeAction =
  | { action: "verify"; months: number | null; source: "PAID" | "ADMIN_GRANT" }
  | { action: "rejectVerification"; reason: string }
  | { action: "unverify"; reason: string };

const DURATIONS: { value: number | null; label: string }[] = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
  { value: null, label: "No end date" },
];

const REJECT_REASONS = ["Payment not received", "Business details couldn't be confirmed", "Incomplete business profile", "Recent complaints from buyers"];

type Mode = "approve" | "reject" | "remove";

/** Approves (paid or gifted), rejects or removes a business's Verified badge. */
export default function VerifyBadgeDialog({ target, onClose, onSave }: {
  target: BadgeTarget | null;
  onClose: () => void;
  onSave: (body: BadgeAction) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("approve");
  const [source, setSource] = useState<"PAID" | "ADMIN_GRANT">("PAID");
  const [months, setMonths] = useState<number | null>(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const v = target?.verification ?? null;
  const state = badgeState(v);
  const requested = !!v?.requestedAt;
  const modes: { value: Mode; label: string }[] = [
    { value: "approve", label: state === "VERIFIED" ? "Extend" : "Approve" },
    ...(requested ? [{ value: "reject" as const, label: "Reject request" }] : []),
    ...(v?.verifiedAt ? [{ value: "remove" as const, label: "Remove badge" }] : []),
  ];
  const current = modes.some(m => m.value === mode) ? mode : "approve";

  function reset() { setMode("approve"); setSource("PAID"); setMonths(1); setReason(""); }

  async function save() {
    const body: BadgeAction =
      current === "approve" ? { action: "verify", months, source }
      : current === "reject" ? { action: "rejectVerification", reason: reason.trim() }
      : { action: "unverify", reason: reason.trim() };
    setBusy(true);
    await onSave(body);
    setBusy(false);
    reset();
  }

  const chip = (active: boolean, tone: "dark" | "sky" | "rose" = "dark") =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
      active
        ? tone === "sky" ? "bg-sky-600 text-white ring-sky-600" : tone === "rose" ? "bg-rose-600 text-white ring-rose-600" : "bg-slate-900 text-white ring-slate-900"
        : "text-slate-600 ring-slate-200 hover:bg-slate-50"
    }`;

  const tooShort = current === "reject" && reason.trim().length < 5;

  return (
    <Dialog.Root open={target !== null} onOpenChange={o => { if (!o && !busy) { reset(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20 focus:outline-none">
          {target && (
            <>
              <div className="flex gap-4">
                <span className="flex flex-shrink-0 items-center justify-center text-sky-600">
                  <BadgeCheck size={20} />
                </span>
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-semibold text-slate-900">Verified badge for {target.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-slate-500">
                    {state === "VERIFIED"
                      ? `Verified${v?.expiresAt ? ` until ${fmtPlanDate(String(v.expiresAt))}` : " with no end date"}${v?.source === "ADMIN_GRANT" ? " (gift)" : ""}.`
                      : state === "EXPIRED" && v?.expiresAt ? `Badge ended on ${fmtPlanDate(String(v.expiresAt))}.`
                      : "Not verified."}
                    {requested && v?.requestedAt && <> The owner asked for it on {fmtPlanDate(String(v.requestedAt))}.</>}
                  </Dialog.Description>
                </div>
              </div>

              {modes.length > 1 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {modes.map(m => (
                    <button key={m.value} type="button" onClick={() => { setMode(m.value); setReason(""); }} aria-pressed={current === m.value}
                      className={chip(current === m.value, m.value === "approve" ? "sky" : "rose")}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {current === "approve" && (
                <>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSource("PAID")} aria-pressed={source === "PAID"} className={chip(source === "PAID")}>
                      Paid · PKR {VERIFIED_BADGE.price.toLocaleString()}/month
                    </button>
                    <button type="button" onClick={() => setSource("ADMIN_GRANT")} aria-pressed={source === "ADMIN_GRANT"} className={chip(source === "ADMIN_GRANT")}>
                      Gift (free)
                    </button>
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <button key={d.label} type="button" onClick={() => setMonths(d.value)} aria-pressed={months === d.value} className={chip(months === d.value)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {state === "VERIFIED" && months !== null ? "The months are added to the time left. " : ""}
                    The owner gets a message in Messages, and the tick shows on their business page and listings straight away.
                  </p>
                </>
              )}

              {current !== "approve" && (
                <>
                  {current === "reject" && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {REJECT_REASONS.map(r => (
                        <button key={r} type="button" onClick={() => setReason(r)} className={chip(reason === r, "rose")}>{r}</button>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={current === "reject" ? "Why it wasn't approved. Shown to the owner…" : "Reason, optional. Shown to the owner…"}
                    aria-label="Reason"
                    className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {current === "reject" ? "The owner is told why and can ask again later." : "The tick disappears straight away and the owner is told in Messages."}
                  </p>
                </>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <button type="button" disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || tooShort}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    current === "approve" ? "bg-slate-900 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {busy ? "Saving…" : current === "approve" ? (state === "VERIFIED" ? "Extend badge" : "Approve badge") : current === "reject" ? "Reject request" : "Remove badge"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
