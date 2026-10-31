"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Panel, btn } from "@/components/admin/ui";
import StatusText from "@/components/ui/StatusText";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { whatsappUrl } from "@/lib/phone";
import type { ExpiringRow } from "@/app/api/admin/expiring/route";

const DAY = 86_400_000;

function when(endsAt: string, now: number): { text: string; tone: string } {
  const ms = new Date(endsAt).getTime() - now;
  const days = Math.round(Math.abs(ms) / DAY);
  if (ms <= 0) return { text: days === 0 ? "Ended today" : `Ended ${days} day${days !== 1 ? "s" : ""} ago`, tone: "text-rose-600" };
  if (ms <= DAY) return { text: "Ends today or tomorrow", tone: "text-rose-600" };
  return { text: `Ends in ${Math.ceil(ms / DAY)} days`, tone: ms <= 3 * DAY ? "text-amber-600" : "text-emerald-600" };
}

/**
 * Admin → Requests → Expiring soon (GET /api/admin/expiring): plans, businesses' free months and Verified badges
 * ending this week or ended last week, soonest first, with Chat (the Support inbox) and WhatsApp to follow up.
 */
export default function ExpiringList() {
  const [rows, setRows] = useState<ExpiringRow[] | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    fetch("/api/admin/expiring")
      .then(r => (r.ok ? r.json() : { rows: [] }))
      .then(d => { setNow(Date.now()); setRows(d.rows ?? []); })
      .catch(() => setRows([]));
  }, []);

  return (
    <Panel>
      {rows === null ? (
        <div className="space-y-px">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-slate-50" />)}</div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <CalendarClock size={28} strokeWidth={1.5} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-900">Nothing ending this week</p>
          <p className="mt-1 text-[13px] text-slate-500">Plans, free months and Verified badges ending in the next 7 days (or that ended in the last 7) show up here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map(r => {
            const w = when(r.endsAt, now);
            const wa = whatsappUrl(r.person.phone, `Hi ${r.person.name ?? ""}, this is AutoGO. Your ${r.label.toLowerCase()} ${w.text.toLowerCase()}. Would you like to renew?`);
            return (
              <li key={`${r.kind}-${r.person.id}-${r.endsAt}`} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-900">
                    {r.business ? <Link href={`/dealers/${r.business.slug}`} className="hover:underline">{r.business.name}</Link> : <span>{r.person.name ?? r.person.email}</span>}
                    <span className="text-xs font-medium text-slate-500">· {r.label}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {r.business ? `${r.person.name ?? "Owner"} · ` : "Private seller · "}{r.person.email}
                    {r.business && <> · Business ID {r.business.id.slice(-6).toUpperCase()}</>}
                  </p>
                  <StatusText className={`mt-1 ${w.tone}`}>
                    {w.text} · {new Date(r.endsAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}
                  </StatusText>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Link href={`/admin/support?with=${r.person.id}`} className={`${btn.base} ${btn.secondary}`}><MessageSquare size={13} /> Chat</Link>
                  {wa && <a href={wa} target="_blank" rel="noreferrer" className={`${btn.base} ${btn.secondary}`}><WhatsAppIcon size={13} className="text-emerald-600" /> WhatsApp</a>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
