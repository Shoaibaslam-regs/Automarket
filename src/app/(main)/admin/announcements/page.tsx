"use client";

import { useEffect, useState } from "react";
import { FileText, Megaphone, Pencil, Pin, PinOff, Save, Send, Trash2, Users, X } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, Segmented, btn, type Tone } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNote from "@/components/ui/DraftNote";
import { ANNOUNCEMENT_KINDS, ANNOUNCEMENT_LABEL, MAX_BODY, MAX_TITLE, OFFICIAL_NAME, type AnnouncementKind } from "@/lib/announcements";

type Post = {
  _id: string; kind: AnnouncementKind; title: string; body: string; link?: string; linkLabel?: string;
  pinned: boolean; endsAt?: string; createdAt: string; updatedAt?: string; createdBy?: { name?: string; email: string } | null;
  /** DRAFT posts are seen only by admins; older posts have no status and are published */
  status?: "DRAFT" | "PUBLISHED";
};
const isDraft = (p?: Post | null) => p?.status === "DRAFT";

const KIND_TONE: Record<AnnouncementKind, Tone> = { ANNOUNCEMENT: "blue", UPDATE: "green", OFFER: "amber" };
const EMPTY = { kind: "ANNOUNCEMENT" as AnnouncementKind, title: "", body: "", link: "", linkLabel: "", endsAt: "", pinned: false };
const fmt = (d: string) => new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

/** Admin: post announcements, updates and offers to every business that follows AutoGO Official. */
export default function AdminAnnouncementsPage() {
  // What this admin's role may do here (src/lib/adminRoles.ts)
  const canWrite = useAdminAccess().can("announcements");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [stats, setStats] = useState({ followers: 0, businesses: 0 });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [reload, setReload] = useState(0);
  // A new post being written is kept in this browser until it's posted or saved as a draft
  const localDraft = useFormDraft("announcement", form, setForm, { isEmpty: f => !f.title.trim() && !f.body.trim(), enabled: !editing });

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setPosts(d.announcements); setStats({ followers: d.followers, businesses: d.businesses }); })
      .catch(e => setError(e.message || "Couldn't load"));
  }, [reload]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(p => ({ ...p, [k]: v }));

  const editingPost = posts?.find(p => p._id === editing) ?? null;
  const drafts = posts?.filter(isDraft) ?? [];
  const published = posts?.filter(p => !isDraft(p)) ?? [];

  /**
   * "post": publish now (a new post, or a draft being edited); "draft": save without notifying anyone;
   * "save": save changes to a published post.
   */
  async function submit(e: React.FormEvent | null, mode: "post" | "draft" | "save") {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const body = {
      ...form,
      endsAt: form.kind === "OFFER" && form.endsAt ? new Date(`${form.endsAt}T23:59:00+05:00`).toISOString() : "",
      ...(editing ? (mode === "post" && isDraft(editingPost) ? { publish: true } : {}) : { draft: mode === "draft" }),
    };
    const res = await fetch(editing ? `/api/admin/announcements/${editing}` : "/api/admin/announcements", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error || "Couldn't save"); return; }
    const notified = `${stats.followers} following business${stats.followers !== 1 ? "es were" : " was"} notified.`;
    setNotice(mode === "draft" ? "Draft saved. Only admins can see it until you publish it." : mode === "post" ? `Posted. ${notified}` : "Post updated.");
    if (!editing) localDraft.clear();
    setEditing(null);
    setForm(EMPTY);
    setReload(n => n + 1);
  }

  async function patch(p: Post, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/announcements/${p._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (body.publish && res.ok) setNotice(`Published “${p.title}”. ${stats.followers} following business${stats.followers !== 1 ? "es were" : " was"} notified.`);
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

  function renderPost(p: Post) {
    const draft = isDraft(p);
    return (
      <li key={p._id} className={`px-4 py-4 sm:px-5 ${editing === p._id ? "bg-indigo-50/50" : ""}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft && <Badge tone="neutral"><FileText size={10} /> Draft</Badge>}
          <Badge tone={KIND_TONE[p.kind]}>{ANNOUNCEMENT_LABEL[p.kind]}</Badge>
          {p.pinned && <Badge tone="violet"><Pin size={10} /> Pinned</Badge>}
          {p.endsAt && <span className="text-[11px] text-slate-500">ends {fmt(p.endsAt)}</span>}
          <span className="ml-auto text-[11px] text-slate-400">
            {draft ? `saved ${fmt(p.updatedAt ?? p.createdAt)}` : fmt(p.createdAt)}{p.createdBy ? ` · ${p.createdBy.name || p.createdBy.email}` : ""}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-slate-900">{p.title}</p>
        <p className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] text-slate-600">{p.body}</p>
        {p.link && <p className="mt-1 truncate text-xs text-indigo-600">{p.linkLabel || "Open"} → {p.link}</p>}
        {canWrite && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {draft && <button onClick={() => patch(p, { publish: true })} className={`${btn.base} bg-slate-900 text-white hover:bg-slate-800`}><Send size={12} /> Publish</button>}
            <button onClick={() => startEdit(p)} className={`${btn.base} ${btn.secondary}`}><Pencil size={12} /> Edit</button>
            {!draft && <button onClick={() => patch(p, { pinned: !p.pinned })} className={`${btn.base} ${btn.secondary}`}>{p.pinned ? <><PinOff size={12} /> Unpin</> : <><Pin size={12} /> Pin</>}</button>}
            <button onClick={() => setDeleting(p)} className={`${btn.base} ${btn.danger}`}><Trash2 size={12} /> Delete</button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div>
      <ConfirmDialog open={deleting !== null} onOpenChange={o => !o && setDeleting(null)} tone="danger" icon={Trash2}
        title={isDraft(deleting) ? "Delete this draft?" : "Delete this post?"} description={isDraft(deleting) ? <>&ldquo;{deleting?.title}&rdquo; was never published, so no business has seen it.</> : <>&ldquo;{deleting?.title}&rdquo; will disappear from every business&apos;s Updates page.</>}
        confirmLabel="Delete post" loadingLabel="Deleting…" loading={busy} onConfirm={remove} />

      <PageHeader title="Announcements" description={`Post to ${OFFICIAL_NAME}. Businesses that follow it see posts in Business → Updates and get a notification.`} />

      <div className="mb-5 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-inset ring-slate-200">
          <Users size={15} className="text-indigo-500" /> <strong className="tabular-nums">{stats.followers}</strong> of {stats.businesses} businesses follow
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-inset ring-slate-200">
          <Megaphone size={15} className="text-amber-500" /> <strong className="tabular-nums">{published.length}</strong> posts{drafts.length ? ` · ${drafts.length} draft${drafts.length !== 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {canWrite && (
          <Panel title={editing ? (isDraft(editingPost) ? "Edit draft" : "Edit post") : "New post"}
            description={editing ? (isDraft(editingPost) ? "Only admins can see it. Publishing notifies followers." : "Followers aren't notified again for edits.") : "Post now, or save a draft to finish later."}
            action={editing ? <button onClick={() => { setEditing(null); setForm(EMPTY); }} className={`${btn.base} ${btn.secondary}`}><X size={13} /> Cancel edit</button> : undefined}>
            <form onSubmit={e => submit(e, editing && !isDraft(editingPost) ? "save" : "post")} className="space-y-3 p-4 sm:p-5">
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
              {!editing && <DraftNote restoredAt={localDraft.restoredAt} savedAt={localDraft.savedAt} onDiscard={() => { localDraft.clear(); setForm(EMPTY); }} />}
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
              {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button type="submit" disabled={busy || !form.title.trim() || !form.body.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  <Send size={15} /> {busy ? "Saving…" : editing && !isDraft(editingPost) ? "Save changes" : isDraft(editingPost) ? "Publish to followers" : "Post to followers"}
                </button>
                {/* Published posts can't go back to being drafts */}
                {(!editing || isDraft(editingPost)) && (
                  <button type="button" onClick={() => submit(null, "draft")} disabled={busy || !form.title.trim() || !form.body.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Save size={15} /> {editing ? "Save draft" : "Save as draft"}
                  </button>
                )}
              </div>
            </form>
          </Panel>
        )}

        <div className="space-y-5">
          {drafts.length > 0 && (
            <Panel title={`Drafts (${drafts.length})`} description="Only admins can see these. Publishing notifies followers.">
              <ul className="divide-y divide-slate-100">{drafts.map(renderPost)}</ul>
            </Panel>
          )}
          <Panel title="Posts" description="Newest first; pinned posts stay on top.">
            {posts === null ? <div className="h-40 animate-pulse" /> : published.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">Nothing posted yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">{published.map(renderPost)}</ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
