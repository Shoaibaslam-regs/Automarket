"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { refreshAdminCounts } from "@/lib/adminCounts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Hand, Headset, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { ConfirmDialog, PageHeader, Segmented, btn } from "@/components/admin/ui";
import AdminBadge from "@/components/AdminBadge";
import { useFormDraft } from "@/hooks/useFormDraft";
import { planInfo, type PlanId } from "@/lib/plans";

type Filter = "open" | "mine" | "done" | "all";
type Conversation = {
  userId: string;
  lastAt: string;
  lastText: string;
  lastFromUser: boolean;
  unread: number;
  open: boolean;
  user: { _id: string; name?: string; email: string; image?: string } | null;
  business: { _id: string; name: string; slug: string } | null;
  takenBy: { _id: string; name?: string; email: string } | null;
};
type Thread = {
  supportId: string;
  person: { _id: string; name?: string; email: string; plan: PlanId };
  business: { _id: string; name: string; slug: string } | null;
  takenBy: { _id: string; name?: string; email: string } | null;
  doneAt: string | null;
  messages: Array<{ _id: string; senderId: string; content: string; createdAt: string; sentBy?: { name?: string; email: string } | null }>;
};

const LIST_POLL_MS = 30_000;
const THREAD_POLL_MS = 15_000;
const short = (id?: string) => (id ? `#${id.slice(-6)}` : "");
const who = (p?: { name?: string; email: string } | null) => p?.name || p?.email || "";
function when(d: string) {
  const t = new Date(d);
  const today = new Date().toDateString() === t.toDateString();
  return t.toLocaleString("en-PK", today ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" });
}

/**
 * The team's shared inbox: every conversation with the AutoGO Support account, readable and answerable by every
 * admin. Replies go out as AutoGO Support; only here does each one show which admin wrote it.
 */
function SupportInbox() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("with");
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ conversations: Conversation[]; open: number; me: string; canDelete: boolean } | null>(null);
  // Only the platform owner deletes finished conversations (one, or the done ones in bulk)
  const [deleteOne, setDeleteOne] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearAge, setClearAge] = useState<"30" | "90" | "all">("90");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const draftValue = useMemo(() => reply, [reply]);
  const draft = useFormDraft(`support:${selected ?? "none"}`, draftValue, setReply, { isEmpty: t => !t.trim(), enabled: !!selected });

  const loadList = useCallback(() => {
    const qs = new URLSearchParams({ filter, ...(q.trim() ? { q: q.trim() } : {}) });
    return fetch(`/api/admin/support?${qs}`).then(r => r.json()).then(d => {
      setList({ conversations: d.conversations ?? [], open: d.open ?? 0, me: d.me, canDelete: d.canDelete === true });
      // The sidebar badge follows every reload, so a reply, Done or Reopen shows there at once
      refreshAdminCounts({ support: d.open ?? 0 });
    }).catch(() => {});
  }, [filter, q]);

  const loadThread = useCallback((id: string) =>
    fetch(`/api/admin/support/${id}`).then(r => (r.ok ? r.json() : null)).then(d => setThread(d)).catch(() => {}), []);

  useEffect(() => {
    const t = setTimeout(() => { loadList(); }, q ? 300 : 0);
    const timer = setInterval(() => { if (document.visibilityState === "visible") loadList(); }, LIST_POLL_MS);
    return () => { clearTimeout(t); clearInterval(timer); };
  }, [loadList, q]);

  useEffect(() => {
    if (!selected) return;
    queueMicrotask(() => { setThread(null); setReply(""); setError(""); });
    loadThread(selected);
    const timer = setInterval(() => { if (document.visibilityState === "visible") loadThread(selected); }, THREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [selected, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [thread?.messages.length]);

  function open(id: string) {
    router.replace(`/admin/support?with=${id}`, { scroll: false });
  }

  async function act(action: "take" | "release" | "done" | "reopen") {
    if (!selected) return;
    await fetch(`/api/admin/support/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    await Promise.all([loadThread(selected), loadList()]);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/admin/support/${selected}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) { setError(d?.error ?? "Couldn't send the reply"); return; }
    draft.clear();
    setReply("");
    await Promise.all([loadThread(selected), loadList()]);
  }

  async function removeOne() {
    if (!selected) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/support/${selected}`, { method: "DELETE" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setDeleting(false);
    setDeleteOne(false);
    if (!res?.ok) { setError(d?.error ?? "Couldn't delete the conversation"); return; }
    setNotice("Conversation deleted from the inbox. They still have their copy.");
    router.replace("/admin/support", { scroll: false });
    await loadList();
  }

  async function clearDone() {
    setDeleting(true);
    const res = await fetch(`/api/admin/support${clearAge === "all" ? "" : `?olderThan=${clearAge}`}`, { method: "DELETE" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setDeleting(false);
    setClearOpen(false);
    if (!res?.ok) { setNotice(d?.error ?? "Couldn't delete the conversations"); return; }
    setNotice(`${d.conversations} done conversation${d.conversations === 1 ? "" : "s"} deleted.`);
    if (selected) router.replace("/admin/support", { scroll: false });
    await loadList();
  }

  const mine = thread?.takenBy && list?.me === thread.takenBy._id;
  const isOpen = list?.conversations.find(c => c.userId === selected)?.open ?? !thread?.doneAt;

  return (
    <div>
      <ConfirmDialog open={deleteOne} onOpenChange={setDeleteOne} tone="danger" icon={Trash2}
        title="Delete this conversation?"
        description={<>It&apos;s removed from the Support inbox for every admin and can&apos;t be brought back. {who(thread?.person) || "They"} keep their copy in Messages, and if they write again a new conversation starts.</>}
        confirmLabel="Delete conversation" loadingLabel="Deleting…" loading={deleting} onConfirm={removeOne} />
      <ConfirmDialog open={clearOpen} onOpenChange={setClearOpen} tone="danger" icon={Trash2}
        title="Delete done conversations?"
        description={
          <div className="space-y-3">
            <p>Only conversations marked done are deleted; anyone still waiting for the team stays. People keep their copies.</p>
            <Segmented<"30" | "90" | "all"> value={clearAge} onChange={setClearAge}
              options={[{ value: "30", label: "Older than 30 days" }, { value: "90", label: "Older than 90 days" }, { value: "all", label: "All done" }]} />
          </div>
        }
        confirmLabel="Delete" loadingLabel="Deleting…" loading={deleting} onConfirm={clearDone} />

      <PageHeader title="Support inbox" description="Every conversation with AutoGO Support. Any admin can read and reply; replies go out as AutoGO Support."
        actions={list?.canDelete ? (
          <button type="button" onClick={() => setClearOpen(true)} className={`${btn.base} ${btn.danger} px-3 py-2 text-[13px]`}><Trash2 size={14} /> Delete done</button>
        ) : undefined} />
      {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Conversations */}
        <section className={`flex min-h-[480px] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 lg:h-[calc(100vh-13rem)] ${selected ? "hidden lg:flex" : "flex"}`}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <Segmented<Filter> value={filter} onChange={setFilter}
              options={[{ value: "open", label: `Open${list ? ` (${list.open})` : ""}` }, { value: "mine", label: "Mine" }, { value: "done", label: "Done" }, { value: "all", label: "All" }]} />
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 ring-1 ring-inset ring-slate-200 focus-within:ring-slate-400">
              <Search size={14} className="text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, business or ID" aria-label="Search conversations"
                className="h-9 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            </label>
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {list === null ? [1, 2, 3, 4].map(i => <li key={i} className="h-16 animate-pulse bg-slate-50" />) :
              list.conversations.length === 0 ? (
                <li className="px-6 py-14 text-center">
                  <Headset size={26} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-900">{filter === "open" ? "Nobody is waiting" : "No conversations"}</p>
                  <p className="mt-1 text-xs text-slate-500">Plan and badge requests, Help & support and feedback land here.</p>
                </li>
              ) : list.conversations.map(c => (
                <li key={c.userId}>
                  <button type="button" onClick={() => open(c.userId)}
                    className={`flex w-full gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${selected === c.userId ? "bg-slate-100" : ""}`}>
                    <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {(c.user?.name || c.user?.email || "?")[0]?.toUpperCase()}
                      {c.unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"} text-slate-900`}>{who(c.user) || "Deleted account"}</span>
                        <span className="ml-auto flex-shrink-0 text-[11px] text-slate-400">{when(c.lastAt)}</span>
                      </span>
                      {c.business && <span className="block truncate text-[11px] text-slate-500">{c.business.name} · {short(c.business._id)}</span>}
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{c.lastFromUser ? "" : "You: "}{c.lastText}</span>
                      {(c.takenBy || !c.open) && (
                        <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                          {!c.open ? "Done" : c.takenBy ? `${list.me === c.takenBy._id ? "You're" : `${who(c.takenBy)} is`} on it` : ""}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>

        {/* Conversation */}
        <section className={`min-h-[480px] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 lg:flex lg:h-[calc(100vh-13rem)] ${selected ? "flex" : "hidden"}`}>
          {!selected ? (
            <div className="m-auto p-10 text-center text-sm text-slate-500">Choose a conversation.</div>
          ) : !thread ? (
            <div className="m-auto p-10 text-sm text-slate-500">Loading…</div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" onClick={() => router.replace("/admin/support", { scroll: false })} className={`${btn.base} ${btn.secondary} lg:hidden`} aria-label="Back to conversations"><ArrowLeft size={14} /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{who(thread.person)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {thread.person.email} · ID {short(thread.person._id)} · {planInfo(thread.person.plan).name}
                    {thread.business && <> · <Link href={`/dealers/${thread.business.slug}`} className="hover:underline">{thread.business.name}</Link> (Business ID {short(thread.business._id)})</>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {thread.takenBy && !mine && <span className="self-center text-xs font-semibold text-indigo-600">{who(thread.takenBy)} is on it</span>}
                  {mine
                    ? <button type="button" onClick={() => act("release")} className={`${btn.base} ${btn.secondary}`}>Let go</button>
                    : <button type="button" onClick={() => act("take")} className={`${btn.base} ${btn.secondary}`}><Hand size={13} /> Take</button>}
                  {isOpen
                    ? <button type="button" onClick={() => act("done")} className={`${btn.base} ${btn.secondary}`}><CheckCircle2 size={13} /> Done</button>
                    : <button type="button" onClick={() => act("reopen")} className={`${btn.base} ${btn.secondary}`}><RotateCcw size={13} /> Reopen</button>}
                  {list?.canDelete && !isOpen && (
                    <button type="button" onClick={() => setDeleteOne(true)} aria-label="Delete conversation" title="Delete conversation" className={`${btn.base} ${btn.danger}`}><Trash2 size={13} /></button>
                  )}
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                {thread.messages.map(m => {
                  const team = m.senderId === thread.supportId;
                  return (
                    <div key={m._id} className={`flex ${team ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={`whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm ${team ? "rounded-br-md bg-slate-900 text-white" : "rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"}`}>
                          {m.content}
                        </div>
                        <p className={`mt-1 flex items-center gap-1 text-[11px] text-slate-400 ${team ? "justify-end" : ""}`}>
                          {team && <><span className="font-semibold text-slate-500">AutoGO Support</span><AdminBadge user={{ isSupportAccount: true }} size={11} />{m.sentBy && <span>· by {who(m.sentBy)}</span>} ·</>}
                          {when(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="border-t border-slate-100 p-3">
                {error && <p role="alert" className="mb-2 text-xs text-rose-600">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={1.9} maxLength={2000}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e); }}
                    placeholder="Reply as AutoGO Support…" aria-label="Reply"
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
                  <button type="submit" disabled={sending || !reply.trim()}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    <Send size={14} /> {sending ? "Sending…" : "Send"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">They see this from AutoGO Support. Replying marks the conversation done until they write again.</p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />}>
      <SupportInbox />
    </Suspense>
  );
}
