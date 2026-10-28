"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { btn } from "@/components/admin/ui";

const MAX_TEXT = 2000;

/**
 * Admin → Businesses ⋯ "Message business": write to the business owner as AutoGO Support. They get it in Messages;
 * the conversation continues in the shared Admin → Support inbox.
 */
export default function MessageBusinessDialog({ business, onClose }: {
  business: { _id: string; name: string; ownerId?: { name?: string; email: string } | null } | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  function close() {
    setText("");
    setError("");
    setSentTo(null);
    onClose();
  }

  async function send() {
    if (!business) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/admin/organizations/${business._id}/message`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) { setError(data?.error ?? "Couldn't send the message"); return; }
    setSentTo(data.ownerId);
  }

  return (
    <Dialog.Root open={business !== null} onOpenChange={o => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          {sentTo ? (
            <div className="text-center">
              <CheckCircle2 size={30} className="mx-auto text-emerald-600" />
              <Dialog.Title className="mt-3 text-base font-semibold text-slate-900">Message sent to {business?.name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">Their replies come to the Support inbox, for the whole team.</Dialog.Description>
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={close} className={`${btn.base} ${btn.secondary} px-3 py-2`}>Done</button>
                <Link href={`/admin/support?with=${sentTo}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                  <MessageSquare size={13} /> Open chat
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900"><MessageSquare size={17} className="text-indigo-600" /> Message {business?.name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                Goes to the owner{business?.ownerId ? ` (${business.ownerId.name || business.ownerId.email})` : ""} in Messages, from AutoGO Support.
              </Dialog.Description>
              <textarea value={text} onChange={e => { setText(e.target.value); setError(""); }} rows={6} maxLength={MAX_TEXT} autoFocus
                placeholder="Write about anything: a listing, a payment, their plan, a complaint…"
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
              <p className="mt-1 text-right text-[11px] text-slate-400">{text.trim().length}/{MAX_TEXT}</p>
              {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <Dialog.Close className={`${btn.base} ${btn.secondary} px-3 py-2`}>Cancel</Dialog.Close>
                <button type="button" onClick={send} disabled={sending || text.trim().length < 2}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {sending ? "Sending…" : "Send message"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
