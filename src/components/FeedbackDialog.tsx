"use client";

import { useEffect, useMemo, useState } from "react";
import SignInLink from "@/components/auth/SignInLink";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, MessageSquareHeart, X } from "lucide-react";
import { useRateLock } from "@/hooks/useRateLock";
import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNote from "@/components/ui/DraftNote";
import { useTurnstile } from "@/components/ui/Turnstile";
import { OPEN_FEEDBACK_EVENT as OPEN_EVENT } from "@/components/FeedbackHost";


const KINDS = [
  { id: "Idea", label: "An idea" },
  { id: "Problem", label: "Something's not working" },
  { id: "Praise", label: "Something I like" },
] as const;

/**
 * "Send feedback": a short note to the AutoGO team. It goes to the support inbox in Messages (topic
 * "Feedback & ideas") with the page it was sent from. Mounted once in Providers; signed-out visitors are asked
 * to sign in.
 */
export default function FeedbackDialog({ startOpen = false }: { startOpen?: boolean }) {
  const { status } = useSession();
  const pathname = usePathname();
  // Loaded by FeedbackHost on the first openFeedback(), which it missed, so it starts open
  const [open, setOpen] = useState(startOpen);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("Idea");
  const [text, setText] = useState("");
  // Closing the dialog keeps what was written for next time
  const draftValue = useMemo(() => ({ kind, text }), [kind, text]);
  const draft = useFormDraft("feedback", draftValue, d => { setKind(d.kind); setText(d.text); }, { isEmpty: d => !d.text.trim() });
  const [sending, setSending] = useState(false);
  const human = useTurnstile("feedback");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  // Its own lock: feedback has a separate limit (two a month), so a full month here doesn't lock Help & support
  const lock = useRateLock("feedback");

  useEffect(() => {
    const show = () => { setSent(false); setError(""); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const note = text.trim();
    if (note.length < 10) { setError("Please write a little more (at least 10 characters)"); return; }
    setSending(true);
    setError("");
    const res = await fetch("/api/support/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "FEEDBACK", message: `${kind}: ${note}\n\nSent from ${pathname}`, cf: await human.take() }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    lock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't send your feedback"); return; }
    draft.clear();
    setText("");
    setSent(true);
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!sending) setOpen(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="flex flex-shrink-0 items-center justify-center text-indigo-600"><MessageSquareHeart size={18} /></span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-slate-900">{sent ? "Thank you!" : "Send feedback"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                {sent ? "The AutoGO team reads every message." : "Tell us what would make AutoGO easier or better for you."}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
          </div>

          {status !== "authenticated" ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-600">Sign in so we can reply to you.</p>
              <SignInLink onClick={() => setOpen(false)} className="block w-full rounded-xl bg-slate-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-800">
                Sign in
              </SignInLink>
            </div>
          ) : sent ? (
            <div className="mt-5 space-y-4">
              <p className="flex items-start gap-2 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="mt-px flex-shrink-0" />
                Sent. If we have a question, we&apos;ll reply in your Messages.
              </p>
              <Dialog.Close asChild>
                <button type="button" className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Done</button>
              </Dialog.Close>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div role="radiogroup" aria-label="Kind of feedback" className="flex flex-wrap gap-1.5">
                {KINDS.map(k => (
                  <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${kind === k.id ? "bg-slate-900 text-white" : "text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-400"}`}>
                    {k.label}
                  </button>
                ))}
              </div>
              <textarea value={text} onChange={e => { setText(e.target.value); setError(""); }} rows={4} maxLength={1800} autoFocus
                placeholder="What would you change, add or fix?" aria-label="Your feedback"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
              {human.widget}
              <DraftNote restoredAt={draft.restoredAt} savedAt={draft.savedAt} onDiscard={() => { draft.clear(); setText(""); }} />
              {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
              <button type="submit" disabled={sending || lock.locked} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {lock.locked ? lock.text : sending ? "Sending…" : "Send feedback"}
              </button>
              <p className="text-center text-[11px] text-slate-400">You can send 2 feedback messages a month.</p>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

