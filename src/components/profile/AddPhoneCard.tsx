"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, X } from "lucide-react";
import { formatPkMobile, normalizePkMobile } from "@/lib/phone";
import { toast } from "@/lib/toast";

/** "Not now" hides the card for this long, per account and browser */
const SNOOZE_DAYS = 14;
const snoozeKey = (userId: string) => `add-phone-snooze:${userId}`;

/**
 * Dashboard card for accounts without a phone (Google sign-ups): saving one lets sellers and businesses call back
 * and, with a password, lets the person sign in with it. Accounts without a password are pointed to Profile → Set a password.
 */
export default function AddPhoneCard({ userId, hasPassword }: { userId: string; hasPassword: boolean }) {
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      let until = 0;
      try { until = Number(localStorage.getItem(snoozeKey(userId)) ?? 0); } catch {}
      setShow(!(until > Date.now()));
    });
  }, [userId]);

  function snooze() {
    try { localStorage.setItem(snoozeKey(userId), String(Date.now() + SNOOZE_DAYS * 86400000)); } catch {}
    setShow(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const e164 = normalizePkMobile(phone);
    if (!e164) { setError("Enter a Pakistani mobile number, like 0300 1234567"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: formatPkMobile(e164) }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) { setError(data?.error ?? "Couldn't save your number. Try again."); return; }
    toast("Phone number saved", { tone: "saved" });
    setSaved(true);
  }

  if (!show) return null;
  return (
    <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_-22px_rgba(79,70,229,0.45)] sm:p-5">
      {saved ? (
        <div className="flex items-start gap-3">
          <Phone size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-slate-900">Your number is saved</p>
            <p className="mt-0.5 text-slate-500">
              {hasPassword
                ? "You can now sign in with it and your password."
                : <>To sign in with it too, <Link href="/profile?tab=password" className="font-semibold text-indigo-600 hover:underline">set a password</Link>. Google sign-in keeps working either way.</>}
            </p>
          </div>
          <button type="button" onClick={() => setShow(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X size={16} /></button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Phone size={18} className="mt-0.5 flex-shrink-0 text-indigo-600" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-900">Add your phone number</p>
              <p className="mt-0.5 text-slate-500">So sellers and businesses can call you back, and so you can sign in with it.</p>
            </div>
          </div>
          <form onSubmit={save} className="flex flex-shrink-0 flex-col gap-2 sm:w-auto">
            <div className="flex gap-2">
              <input value={phone} onChange={e => { setPhone(e.target.value); setError(""); }} type="tel" inputMode="tel" autoComplete="tel"
                placeholder="0300 1234567" aria-label="Phone number"
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 sm:w-44" />
              <button type="submit" disabled={saving || !phone.trim()}
                className="h-9 flex-shrink-0 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={snooze}
                className="h-9 flex-shrink-0 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
                Not now
              </button>
            </div>
            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          </form>
        </div>
      )}
    </section>
  );
}
