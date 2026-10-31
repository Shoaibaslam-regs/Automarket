"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, FileText, Newspaper, Pencil, Plus, Send, Save, Trash2 } from "lucide-react";
import { Badge, ConfirmDialog, PageHeader, Panel, Segmented, btn } from "@/components/admin/ui";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNote from "@/components/ui/DraftNote";
import PhotoUploadButton, { RemovePhotoButton } from "@/components/ui/PhotoUploadButton";
import BlogBody from "@/components/blog/BlogBody";
import { BLOG_CATEGORIES, BLOG_CATEGORY, BLOG_LIMITS, blogDate, blogSlug, readingMinutes, type BlogCategory, type BlogPost } from "@/lib/blog";

type Row = Omit<BlogPost, "body">;
type Form = { title: string; slug: string; excerpt: string; body: string; category: BlogCategory; coverImage: string };

const EMPTY: Form = { title: "", slug: "", excerpt: "", body: "", category: "BUYING", coverImage: "" };
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const label = "mb-1 block text-xs font-semibold text-slate-700";
const MARKS = "## Heading · - point · 1. step · > tip · **bold** · blank line = new paragraph";

/**
 * Admin → Blog: write, edit, publish and unpublish posts on the public blog (/blog). The editor saves itself in
 * this browser as you type (one draft for a new post, one per post being edited), previews the post as readers
 * will see it, and "Save draft" keeps it on the server for the other admins without publishing it.
 */
export default function AdminBlogPage() {
  const canWrite = useAdminAccess().can("announcements");
  const [posts, setPosts] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [opened, setOpened] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch("/api/admin/blog")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setPosts(d.posts); })
      .catch(e => setError(e.message || "Couldn't load posts"));
  }, [reload]);

  // Auto-save in this browser while the editor is open; only once something changed
  const draftValue = useMemo(() => form, [form]);
  const localDraft = useFormDraft(editing && editing !== "new" ? `blog:${editing._id}` : "blog:new", draftValue, setForm, {
    isEmpty: f => JSON.stringify(f) === JSON.stringify(opened) || (!f.title.trim() && !f.body.trim()),
    enabled: !!editing,
  });

  const drafts = posts?.filter(p => p.status === "DRAFT") ?? [];
  const published = posts?.filter(p => p.status === "PUBLISHED") ?? [];
  const isNew = editing === "new";
  const live = !!editing && editing !== "new" && editing.status === "PUBLISHED";

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v, ...(k === "title" && isNew && !slugTouched ? { slug: blogSlug(String(v)) } : {}) }));
  }

  function openNew() {
    setEditing("new");
    setForm(EMPTY);
    setOpened(EMPTY);
    setSlugTouched(false);
    setView("write");
    setError("");
    setNotice("");
  }

  async function openEdit(p: Row) {
    setError("");
    setNotice("");
    setBusy(p._id);
    const res = await fetch(`/api/admin/blog/${p._id}`).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "Couldn't open the post"); return; }
    const saved: Form = { title: d.post.title, slug: d.post.slug, excerpt: d.post.excerpt, body: d.post.body, category: d.post.category, coverImage: d.post.coverImage ?? "" };
    setForm(saved);
    setOpened(saved);
    setSlugTouched(true);
    setView("write");
    setEditing(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    setEditing(null);
    setForm(EMPTY);
  }

  /** "draft" keeps it unpublished (or saves a draft's changes); "publish" puts it live; "save" updates a live post. */
  async function submit(mode: "draft" | "publish" | "save") {
    setBusy("form");
    setError("");
    setNotice("");
    const body = { ...form, ...(mode === "publish" ? { publish: true } : {}) };
    const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${(editing as Row)._id}`, {
      method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "Couldn't save. Please try again."); return; }
    localDraft.clear();
    setNotice(mode === "publish" ? `Published “${d.post.title}”. It's live on the blog.` : mode === "draft" ? "Draft saved. Only admins can see it until you publish it." : "Post updated.");
    close();
    setReload(n => n + 1);
  }

  async function togglePublish(p: Row) {
    setBusy(p._id);
    setError("");
    const res = await fetch(`/api/admin/blog/${p._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publish: p.status !== "PUBLISHED" }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "Couldn't update the post"); return; }
    setNotice(p.status === "PUBLISHED" ? `“${p.title}” is a draft again and off the blog.` : `Published “${p.title}”.`);
    setReload(n => n + 1);
  }

  async function remove() {
    if (!deleting) return;
    setBusy(deleting._id);
    const res = await fetch(`/api/admin/blog/${deleting._id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { setError("Couldn't delete the post"); return; }
    if (editing && editing !== "new" && editing._id === deleting._id) close();
    setDeleting(null);
    setReload(n => n + 1);
  }

  function renderRow(p: Row) {
    const cat = BLOG_CATEGORY[p.category];
    return (
      <li key={p._id} className={`flex gap-3 px-4 py-3.5 sm:px-5 ${editing && editing !== "new" && editing._id === p._id ? "bg-indigo-50/50" : ""}`}>
        <span className="relative hidden h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block">
          {p.coverImage ? <Image src={p.coverImage} alt="" fill sizes="80px" className="object-cover" /> : <Newspaper size={18} className="absolute inset-0 m-auto text-slate-300" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px]">
            <span className={`font-semibold ${cat.text}`}>{cat.label}</span>
            {p.status === "DRAFT" && <Badge tone="neutral">Draft</Badge>}
            <span className="text-slate-400">{p.publishedAt && p.status === "PUBLISHED" ? `Published ${blogDate(p.publishedAt)}` : p.updatedAt ? `Edited ${blogDate(p.updatedAt)}` : ""}</span>
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{p.title}</p>
          <p className="truncate text-xs text-slate-500">/blog/{p.slug}</p>
          {canWrite && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => openEdit(p)} disabled={busy === p._id} className={`${btn.base} ${btn.secondary}`}><Pencil size={12} /> Edit</button>
              <button type="button" onClick={() => togglePublish(p)} disabled={busy === p._id} className={`${btn.base} ${btn.secondary}`}>
                {p.status === "PUBLISHED" ? <><EyeOff size={12} /> Unpublish</> : <><Send size={12} /> Publish</>}
              </button>
              {p.status === "PUBLISHED" && <Link href={`/blog/${p.slug}`} className={`${btn.base} ${btn.secondary}`}><ExternalLink size={12} /> View</Link>}
              <button type="button" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`} className={`${btn.base} ${btn.danger}`}><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <div>
      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} tone="danger" icon={Trash2} title="Delete this post?"
        description={deleting?.status === "PUBLISHED" ? "It disappears from the blog and its link stops working. To only take it off the blog, Unpublish it instead." : "The draft is deleted for every admin."}
        confirmLabel="Delete post" loading={!!deleting && busy === deleting._id} onConfirm={remove} />

      <PageHeader title="Blog" description="Guides and news on the public blog (/blog). Write here, preview, then publish."
        actions={<>
          <Link href="/blog" className={`${btn.base} ${btn.secondary} px-3 py-2`}><ExternalLink size={13} /> Open blog</Link>
          {canWrite && !editing && <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"><Plus size={14} /> New post</button>}
        </>} />

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{notice}</p>}

      {editing && (
        <Panel title={isNew ? "New post" : live ? "Edit published post" : "Edit draft"} className="mb-6"
          action={<Segmented value={view} onChange={setView} options={[{ value: "write", label: <><Pencil size={13} /> Write</> }, { value: "preview", label: <><Eye size={13} /> Preview</> }]} />}>
          {view === "preview" ? (
            <article className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
              <p className={`text-xs font-semibold ${BLOG_CATEGORY[form.category].text}`}>{BLOG_CATEGORY[form.category].label} · {readingMinutes(form.body)} min read</p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">{form.title || "Your title"}</h1>
              {form.excerpt && <p className="mt-3 text-base text-slate-500">{form.excerpt}</p>}
              {form.coverImage && (
                <span className="relative mt-5 block aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100"><Image src={form.coverImage} alt="" fill sizes="672px" className="object-cover" /></span>
              )}
              <div className="mt-6"><BlogBody body={form.body || "Your post's text appears here."} /></div>
            </article>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submit(live ? "save" : "publish"); }} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div>
                  <label htmlFor="blog-title" className={label}>Title</label>
                  <input id="blog-title" value={form.title} maxLength={BLOG_LIMITS.title} onChange={e => set("title", e.target.value)} required
                    placeholder="e.g. Buying a used car in Pakistan: the complete checklist" className={`${field} text-base font-semibold`} />
                </div>
                <div>
                  <label htmlFor="blog-excerpt" className={label}>Summary <span className="font-normal text-slate-400">(on the blog page and in Google)</span></label>
                  <textarea id="blog-excerpt" value={form.excerpt} maxLength={BLOG_LIMITS.excerpt} rows={2} onChange={e => set("excerpt", e.target.value)} required
                    placeholder="One or two sentences on what readers will learn" className={field} />
                  <p className="mt-1 text-right text-[11px] text-slate-400">{form.excerpt.length}/{BLOG_LIMITS.excerpt}</p>
                </div>
                <div>
                  <label htmlFor="blog-body" className={label}>Post</label>
                  <textarea id="blog-body" value={form.body} maxLength={BLOG_LIMITS.body} rows={18} onChange={e => set("body", e.target.value)} required
                    placeholder={"Start with a short introduction.\n\n## First heading\n- A point\n- Another point\n\n> A tip readers shouldn't miss"} className={`${field} font-mono text-[13px] leading-6`} />
                  <p className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
                    <span>{MARKS}</span><span>{readingMinutes(form.body)} min read · {form.body.length.toLocaleString()}/{BLOG_LIMITS.body.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className={label}>Category</span>
                  <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Category">
                    {BLOG_CATEGORIES.map(c => (
                      <button key={c} type="button" role="radio" aria-checked={form.category === c} onClick={() => set("category", c)}
                        className={`rounded-lg px-2.5 py-2 text-left text-xs font-semibold ring-1 ring-inset transition ${form.category === c ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"}`}>
                        {BLOG_CATEGORY[c].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="blog-slug" className={label}>Web address</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white pl-3 text-sm focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
                    <span className="text-slate-400">/blog/</span>
                    <input id="blog-slug" value={form.slug} maxLength={BLOG_LIMITS.slug} onChange={e => { setSlugTouched(true); set("slug", e.target.value); }}
                      onBlur={() => set("slug", blogSlug(form.slug))} className="min-w-0 flex-1 rounded-xl bg-transparent px-1 py-2.5 text-slate-900 outline-none" />
                  </div>
                  {live && <p className="mt-1 text-[11px] text-amber-700">Changing it breaks links people already shared.</p>}
                </div>
                <div>
                  <span className={label}>Cover photo <span className="font-normal text-slate-400">(optional, wide photos look best)</span></span>
                  {form.coverImage && (
                    <span className="relative mb-2 block aspect-[16/9] overflow-hidden rounded-xl bg-slate-100"><Image src={form.coverImage} alt="" fill sizes="300px" className="object-cover" /></span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <PhotoUploadButton endpoint="blogImage" hasPhoto={!!form.coverImage} onUploaded={url => set("coverImage", url)} onError={setError} />
                    {form.coverImage && <RemovePhotoButton onClick={() => set("coverImage", "")} />}
                  </div>
                </div>

                <DraftNote restoredAt={localDraft.restoredAt} savedAt={localDraft.savedAt} onDiscard={() => { localDraft.clear(); setForm(opened); }} />

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                  <button type="submit" disabled={busy === "form"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {live ? <><Save size={15} /> Save changes</> : <><Send size={15} /> Publish</>}
                  </button>
                  {!live && (
                    <button type="button" disabled={busy === "form"} onClick={e => { if (e.currentTarget.form?.reportValidity()) submit("draft"); }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                      <FileText size={15} /> Save as draft
                    </button>
                  )}
                  <button type="button" onClick={close} className="px-4 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button>
                </div>
              </div>
            </form>
          )}
        </Panel>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title={`Published (${published.length})`} description="Live on /blog, newest first">
          {posts === null ? <div className="h-32 animate-pulse" /> : published.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Nothing published yet.</p>
          ) : <ul className="divide-y divide-slate-100">{published.map(renderRow)}</ul>}
        </Panel>
        <Panel title={`Drafts (${drafts.length})`} description="Only admins see these">
          {posts === null ? <div className="h-32 animate-pulse" /> : drafts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No drafts.</p>
          ) : <ul className="divide-y divide-slate-100">{drafts.map(renderRow)}</ul>}
        </Panel>
      </div>
    </div>
  );
}
