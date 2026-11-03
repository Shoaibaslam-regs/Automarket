"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";

/**
 * Admin Overview switch for "AutoGO in numbers" (listings, businesses, users and deals counts) on the home and About
 * pages (src/lib/siteFlags.ts). Hidden until switched on, so small early numbers don't put visitors off.
 */
export default function HomeStatsSetting() {
  const canWrite = useAdminAccess().can("settings");
  const [show, setShow] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/home-stats").then(r => r.json()).then(d => setShow(d.show === true)).catch(() => setShow(false));
  }, []);

  async function toggle() {
    if (show === null) return;
    setSaving(true);
    setNotice("");
    const res = await fetch("/api/admin/home-stats", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ show: !show }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) { setNotice(d?.error || "Couldn't save"); return; }
    setShow(d.show);
    setNotice(d.show ? "Shown on the home and About pages." : "Hidden from the home and About pages.");
  }

  return (
    <Panel title="AutoGO in numbers" description="The live counts block (listings, businesses, users, deals) on the home and About pages. Keep it hidden until the numbers look good." className="mb-4 lg:mb-6">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <button type="button" role="switch" aria-checked={!!show} aria-label="Show AutoGO in numbers" disabled={!canWrite || saving || show === null} onClick={toggle}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50 ${show ? "bg-indigo-600" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${show ? "left-[22px]" : "left-0.5"}`} />
        </button>
        <p className="text-sm font-medium text-slate-900">{show === null ? "Loading…" : show ? "Shown to visitors" : "Hidden from visitors"}</p>
        {!canWrite && <p className="text-xs text-slate-500">Only full admins can change this.</p>}
        {notice && <p role="status" className="text-xs font-semibold text-slate-600">{notice}</p>}
      </div>
    </Panel>
  );
}
