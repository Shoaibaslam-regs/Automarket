"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Shuffle } from "lucide-react";
import { Panel, btn } from "@/components/admin/ui";
import { useRateLock } from "@/hooks/useRateLock";

type Status = { canChange: boolean; source?: "panel" | "env" | "none"; changedAt?: string | null };

const INPUT = "mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm text-slate-900 outline-none focus:border-slate-900";

/** 24 random letters and digits (no "@" or spaces, which the login field can't take). */
function randomKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

/**
 * Admin Overview box, platform owner only: changes the key typed into the email field on /login to open the
 * admin sign-in form. The new key works at once and the old one stops working (src/lib/adminKey.ts).
 */
export default function AdminKeySettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [password, setPassword] = useState("");
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const lock = useRateLock("adminKeyChange");

  useEffect(() => {
    fetch("/api/admin/access-key").then(r => r.json()).then(setStatus).catch(() => {});
  }, []);

  if (!status?.canChange) return null;

  function generate() {
    const k = randomKey();
    setNewKey(k);
    setConfirmKey(k);
    setShow(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (newKey.trim() !== confirmKey.trim()) { setNotice({ ok: false, text: "The two keys don't match" }); return; }
    setSaving(true);
    const res = await fetch("/api/admin/access-key", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, newKey }) });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (lock.check(res, d)) { setNotice({ ok: false, text: d.error }); return; }
    if (!res.ok) { setNotice({ ok: false, text: d.error || "Couldn't change the key" }); return; }
    setStatus({ canChange: true, source: d.source, changedAt: d.changedAt });
    setPassword("");
    setNewKey("");
    setConfirmKey("");
    setShow(false);
    setNotice({ ok: true, text: "Key changed. Use the new key on the login page from now on; the old one no longer works." });
  }

  const current = status.source === "panel"
    ? `Set here${status.changedAt ? ` on ${new Date(status.changedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}` : ""}.`
    : status.source === "env" ? "From ADMIN_ACCESS_KEY in the server settings." : "No key is set, so the admin form can't be opened.";

  return (
    <Panel
      title="Admin access key"
      description="The key you type into the email field on the login page to open the admin sign-in. Only you (the platform owner) can change it."
      className="mb-4 lg:mb-6"
    >
      <form onSubmit={save} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <p className="text-xs text-slate-500 sm:col-span-2">Current key: {current}</p>
        <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
          Your password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required
            className={`${INPUT} font-sans sm:max-w-sm`} />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          New key
          <input type={show ? "text" : "password"} value={newKey} onChange={e => setNewKey(e.target.value)} autoComplete="new-password"
            required minLength={16} maxLength={128} spellCheck={false} placeholder="At least 16 characters, no spaces or @" className={INPUT} />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Repeat new key
          <input type={show ? "text" : "password"} value={confirmKey} onChange={e => setConfirmKey(e.target.value)} autoComplete="new-password"
            required minLength={16} maxLength={128} spellCheck={false} className={INPUT} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="button" onClick={generate} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <Shuffle size={13} /> Generate a strong key
          </button>
          <button type="button" onClick={() => setShow(s => !s)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            {show ? <EyeOff size={13} /> : <Eye size={13} />} {show ? "Hide" : "Show"} key
          </button>
        </div>
        {show && newKey && <p className="text-xs text-amber-700 sm:col-span-2">Copy the key somewhere safe before saving. It can&apos;t be shown again.</p>}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={saving || lock.locked} className={`${btn.base} bg-slate-900 px-4 py-2 text-white hover:bg-slate-800`}>
            {lock.locked ? lock.text : saving ? "Saving…" : "Change key"}
          </button>
          {notice && <p role="status" className={`text-xs font-semibold ${notice.ok ? "text-emerald-700" : "text-rose-600"}`}>{notice.text}</p>}
        </div>
      </form>
    </Panel>
  );
}
