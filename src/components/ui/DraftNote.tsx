"use client";

import { FileText } from "lucide-react";

const time = (at: number) =>
  new Date(at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });

/**
 * The line under a form that `useFormDraft` keeps: "Restored your draft from 27 Oct, 4:10 pm · Discard" after a
 * draft was put back, or a quiet "Draft saved" while typing. Renders nothing otherwise. Colours follow the theme.
 */
export default function DraftNote({
  restoredAt,
  savedAt,
  onDiscard,
  className = "",
}: {
  restoredAt: number | null;
  savedAt: number | null;
  onDiscard: () => void;
  className?: string;
}) {
  if (!restoredAt && !savedAt) return null;
  return (
    <p role="status" className={`flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 ${className}`}>
      <FileText size={12} className="flex-shrink-0 text-slate-400" aria-hidden />
      {restoredAt ? <>Restored your draft from {time(restoredAt)}</> : <>Draft saved on this device</>}
      <span aria-hidden>·</span>
      <button type="button" onClick={onDiscard} className="font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">
        Discard
      </button>
    </p>
  );
}
