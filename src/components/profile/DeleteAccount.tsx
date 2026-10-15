"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useRateLock } from "@/hooks/useRateLock";

type Check = {
  blockers: string[];
  summary: { listings: number; bookings: number; messages: number; savedSearches: number; reviews: number };
  businessMember: string | null;
  email: string;
  hasPassword: boolean;
};

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** "Danger zone" on Profile & settings: permanently deletes the user's own account after they confirm. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [loadError, setLoadError] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const delLock = useRateLock("accountDelete");
  const [error, setError] = useState("");

  function openDialog() {
    setOpen(true);
    setCheck(null);
    setLoadError("");
    setConfirmEmail("");
    setPassword("");
    setError("");
    fetch("/api/profile/account")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't check your account");
        setCheck(d);
      })
      .catch(e => setLoadError(e.message));
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setError("");
    const res = await fetch("/api/profile/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail, password }),
    });
    const data = await res.json().catch(() => ({}));
    delLock.check(res, data);
    if (!res.ok) {
      setDeleting(false);
      setError(data.error || "Couldn't delete your account");
      return;
    }
    // The account is gone, so end the session and leave the signed-in area
    await signOut({ callbackUrl: "/" });
  }

  const blocked = !!check && check.blockers.length > 0;
  const matches = !!check && confirmEmail.trim().toLowerCase() === check.email.toLowerCase();
  const ready = matches && (!check?.hasPassword || password.length > 0);
  const s = check?.summary;

  return (
    <div className="mt-5 rounded-xl border border-rose-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-rose-700"><AlertTriangle size={16} /> Danger zone</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
        Deleting your account removes your profile, listings, saved searches, messages and reviews for good. It can&apos;t be undone.
      </p>
      <button
        type="button"
        onClick={openDialog}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        <Trash2 size={14} /> Delete my account
      </button>

      <Dialog.Root open={open} onOpenChange={o => !deleting && setOpen(o)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <Dialog.Title className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white"><Trash2 size={15} /></span>
                Delete your account
              </Dialog.Title>
              <Dialog.Close aria-label="Close" disabled={deleting} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Permanently delete your AutoMarket account and its data.</Dialog.Description>

            <div className="px-5 py-5">
              {loadError ? (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 ring-1 ring-inset ring-rose-200">{loadError}</p>
              ) : !check ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-5 animate-pulse rounded bg-slate-100" />)}</div>
              ) : blocked ? (
                <>
                  <p className="text-[13px] font-semibold text-slate-900">Before you can delete your account:</p>
                  <ul className="mt-3 space-y-2">
                    {check.blockers.map(b => (
                      <li key={b} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 ring-1 ring-inset ring-amber-200">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                    {check.blockers.some(b => b.includes("business")) && <Link href="/business/settings" className="font-semibold text-indigo-600 hover:underline">Business settings →</Link>}
                    {check.blockers.some(b => b.includes("booking")) && <Link href="/bookings" className="font-semibold text-indigo-600 hover:underline">My bookings →</Link>}
                  </div>
                </>
              ) : (
                <form onSubmit={remove}>
                  <div className="rounded-lg bg-rose-50 px-3.5 py-3 text-[13px] text-rose-800 ring-1 ring-inset ring-rose-200">
                    <p className="font-semibold">This permanently deletes:</p>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                      <li>Your profile and sign-in</li>
                      {s!.listings > 0 && <li>{plural(s!.listings, "listing")} and their photos</li>}
                      {s!.messages > 0 && <li>{plural(s!.messages, "message")}</li>}
                      {s!.savedSearches > 0 && <li>{plural(s!.savedSearches, "saved search", "saved searches")}</li>}
                      {s!.reviews > 0 && <li>{plural(s!.reviews, "review")} you wrote</li>}
                      <li>Your saved vehicles</li>
                    </ul>
                    {s!.bookings > 0 && <p className="mt-2 text-xs text-rose-700/80">Pending bookings are cancelled. Past bookings stay on the other person&apos;s records.</p>}
                    {check.businessMember && <p className="mt-2 text-xs text-rose-700/80">You&apos;ll also leave the team of {check.businessMember}.</p>}
                  </div>

                  <label htmlFor="del-email" className="mt-4 block text-xs font-semibold text-slate-900">
                    Type your email <span className="font-mono font-normal text-slate-500">{check.email}</span> to confirm
                  </label>
                  <input id="del-email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} autoComplete="off" spellCheck={false} disabled={deleting}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15" />
                  {check.hasPassword && (
                    <>
                      <label htmlFor="del-password" className="mt-3 block text-xs font-semibold text-slate-900">Your password</label>
                      <input id="del-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={deleting}
                        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15" />
                    </>
                  )}
                  {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
                  <button type="submit" disabled={!ready || deleting || delLock.locked}
                    className="mt-4 w-full rounded-lg bg-rose-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                    {delLock.locked ? delLock.text : deleting ? "Deleting your account…" : "Permanently delete my account"}
                  </button>
                </form>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
