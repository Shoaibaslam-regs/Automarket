"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pencil, Pin, PinOff, Send, Trash2, Users, X } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, Segmented, btn, type Tone } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { ANNOUNCEMENT_KINDS, ANNOUNCEMENT_LABEL, MAX_BODY, MAX_TITLE, OFFICIAL_NAME, type AnnouncementKind } from "@/lib/announcements";

type Post = {
  _id: string; kind: AnnouncementKind; title: string; body: string; link?: string; linkLabel?: string;
  pinned: boolean; endsAt?: string; createdAt: string; createdBy?: { name?: string; email: string } | null;
};

const KIND_TONE: Record<AnnouncementKind, Tone> = { ANNOUNCEMENT: "blue", UPDATE: "green", OFFER: "amber" };
const EMPTY = { kind: "ANNOUNCEMENT" as AnnouncementKind, title: "", body: "", link: "", linkLabel: "", endsAt: "", pinned: false };
const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

/** Admin: post announcements, updates and offers to every business that follows AutoGO Official. */
export default function AdminAnnouncementsPage() {
  const { canWrite } = useAdminAccess();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [stats, setStats] = useState({ followers: 0, businesses: 0 });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setPosts(d.announcements); setStats({ followers: d.followers, businesses: d.businesses }); })
      .catch(e => setError(e.message || "Couldn't load"));
  }, [reload]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const body = { ...form, endsAt: form.kind === "OFFER" && form.endsAt ? new Date(`${form.endsAt}T23:59:00+05:00`).toISOString() : "" };
    const res = await fetch(editing ? `/api/admin/announcements/${editing}` : "/api/admin/announcements", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't save"); return; }
    setNotice(editing ? "Post updated." : `Posted. ${stats.followers} following business${stats.followers !== 1 ? "es were" : " was"} notified.`);
    setEditing(null);
    setForm(EMPTY);
    setReload(n => n + 1);
  }

  async function patch(p: Post, body: Record<string, unknown>) {
    await fetch(`/api/admin/announcements/${p._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setReload(n => n + 1);
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    await fetch(`/api/admin/announcements/${deleting._id}`, { method: "DELETE" });
    setBusy(false);
    if (editing === deleting._id) { setEditing(null); setForm(EMPTY); }
    setDeleting(null);
    setReload(n => n + 1);
  }

  function startEdit(p: Post) {
    setEditing(p._id);
    setNotice("");
    setForm({ kind: p.kind, title: p.title, body: p.body, link: p.link ?? "", linkLabel: p.linkLabel ?? "", endsAt: p.endsAt ? new Date(new Date(p.endsAt).getTime() + 5 * 3600e3).toISOString().slice(0, 10) : "", pinned: p.pinned });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <ConfirmDialog open={deleting !== null} onOpenChange={o => !o && setDeleting(null)} tone="danger" icon={Trash2}
        title="Delete this post?" description={<>&ldquo;{deleting?.title}&rdquo; will disappear from every business&apos;s Updates page.</>}
        confirmLabel="Delete post" loadingLabel="Deleting…" loading={busy} onConfirm={remove} />

      <PageHeader title="Announcements" description={`Post to ${OFFICIAL_NAME}. Businesses that follow it see posts in Business → Updates and get a notification.`} />

      <div className="mb-5 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-inset ring-slate-200">
          <Users size={15} className="text-indigo-500" /> <strong className="tabular-nums">{stats.followers}</strong> of {stats.businesses} businesses follow
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-inset ring-slate-200">
          <Megaphone size={15} className="text-amber-500" /> <strong className="tabular-nums">{posts?.length ?? 0}</strong> posts
        </span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {canWrite && (
          <Panel title={editing ? "Edit post" : "New post"} description={editing ? "Followers aren't notified again for edits." : "Followers get a notification straight away."}
            action={editing ? <button onClick={() => { setEditing(null); setForm(EMPTY); }} className={`${btn.base} ${btn.secondary}`}><X size={13} /> Cancel edit</button> : undefined}>
            <form onSubmit={submit} className="space-y-3 p-4 sm:p-5">
              <Segmented value={form.kind} onChange={v => set("kind", v)} options={ANNOUNCEMENT_KINDS.map(k => ({ value: k, label: ANNOUNCEMENT_LABEL[k] }))} />
              <input value={form.title} onChange={e => set("title", e.target.value)} maxLength={MAX_TITLE} placeholder="Title, e.g. 20% off Premium Plus this week" aria-label="Title" className={`${field} h-11`} />
              <textarea value={form.body} onChange={e => set("body", e.target.value)} maxLength={MAX_BODY} rows={6} placeholder="Message" aria-label="Message" className={`${field} py-2.5`} />
              <p className="-mt-2 text-right text-[11px] text-slate-400">{form.body.length}/{MAX_BODY}</p>
              <div className="grid grid-cols-[1fr_130px] gap-2">
                <input value={form.link} onChange={e => set("link", e.target.value)} placeholder="Button link (optional): /pricing or https://…" aria-label="Link" className={`${field} h-10`} />
                <input value={form.linkLabel} onChange={e => set("linkLabel", e.target.value)} maxLength={40} placeholder="Button text" aria-label="Button text" disabled={!form.link} className={`${field} h-10 disabled:opacity-50`} />
              </div>
              {form.kind === "OFFER" && (
                <label className="block text-xs font-semibold text-slate-700">
                  Offer ends (optional)
                  <input type="date" value={form.endsAt} onChange={e => set("endsAt", e.target.value)} className={`${field} mt-1 h-10`} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.pinned} onChange={e => set("pinned", e.target.checked)} className="h-4 w-4 accent-slate-900" /> Pin to the top of the feed
              </label>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
              {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}
              <button type="submit" disabled={busy || !form.title.trim() || !form.body.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                <Send size={15} /> {busy ? "Saving…" : editing ? "Save changes" : "Post to followers"}
              </button>
            </form>
          </Panel>
        )}

        <Panel title="Posts" description="Newest first; pinned posts stay on top.">
          {posts === null ? <div className="h-40 animate-pulse" /> : posts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Nothing posted yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {posts.map(p => (
                <li key={p._id} className={`px-4 py-4 sm:px-5 ${editing === p._id ? "bg-indigo-50/50" : ""}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={KIND_TONE[p.kind]}>{ANNOUNCEMENT_LABEL[p.kind]}</Badge>
                    {p.pinned && <Badge tone="violet"><Pin size={10} /> Pinned</Badge>}
                    {p.endsAt && <span className="text-[11px] text-slate-500">ends {fmt(p.endsAt)}</span>}
                    <span className="ml-auto text-[11px] text-slate-400">{fmt(p.createdAt)}{p.createdBy ? ` · ${p.createdBy.name || p.createdBy.email}` : ""}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] text-slate-600">{p.body}</p>
                  {p.link && <p className="mt-1 truncate text-xs text-indigo-600">{p.linkLabel || "Open"} → {p.link}</p>}
                  {canWrite && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <button onClick={() => startEdit(p)} className={`${btn.base} ${btn.secondary}`}><Pencil size={12} /> Edit</button>
                      <button onClick={() => patch(p, { pinned: !p.pinned })} className={`${btn.base} ${btn.secondary}`}>{p.pinned ? <><PinOff size={12} /> Unpin</> : <><Pin size={12} /> Pin</>}</button>
                      <button onClick={() => setDeleting(p)} className={`${btn.base} ${btn.danger}`}><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
