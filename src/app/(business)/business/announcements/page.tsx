"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Newspaper, Pencil, Pin, PinOff, Plus, Square, Trash2, X } from "lucide-react";
import DraftNote from "@/components/ui/DraftNote";
import { useFormDraft } from "@/hooks/useFormDraft";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import { ShopNoticeCard } from "@/components/business/ShopNoticeCard";
import {
  MAX_NOTICE_BODY, MAX_NOTICE_TITLE, NOTICE_DEFAULT_DAYS, NOTICE_MAX_DAYS, SHOP_NOTICES_SHOWN, SHOP_NOTICE_KIND, SHOP_NOTICE_KINDS,
  isLive, noticesToShow, shortDate, type ShopNotice, type ShopNoticeKind,
} from "@/lib/shopNotices";

type Data = { notices: ShopNotice[]; canEdit: boolean; shop: { slug: string; name: string } | null };
type Form = { kind: ShopNoticeKind; title: string; body: string; eventAt: string; endsAt: string; link: string; linkLabel: string; pinned: boolean };

const DAY = 86_400_000;
/** "YYYY-MM-DD" in Pakistan time, for the "show until" date box. */
const pkDay = (d: Date) => new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
/** A moment as the browser's datetime-local value ("2026-11-08T16:00"). */
const localInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const field = "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const iconBtn = "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const emptyForm = (): Form => ({
  kind: "NEWS", title: "", body: "", eventAt: "", endsAt: pkDay(new Date(Date.now() + NOTICE_DEFAULT_DAYS * DAY)), link: "", linkLabel: "", pinned: false,
});

/**
 * Business → Announcements: news, events, offers and important notices on the business's shop page
 * (/dealers/[slug]). Owners and managers post, edit, pin, end and delete them; everyone in the team can see them.
 * The form previews the card exactly as visitors will see it, and saves itself on this device as you type
 * (useFormDraft, one draft for a new announcement and one per announcement being edited), so tapping outside the
 * dialog or closing the tab loses nothing: opening the form again puts the text back.
 */
export default function AnnouncementsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShopNotice | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // The form as it opened, so an edit only keeps a draft once something was changed
  const [opened, setOpened] = useState<Form>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ShopNotice | null>(null);
  const [reload, setReload] = useState(0);
  // The "show until" box allows today up to NOTICE_MAX_DAYS ahead (worked out once, when the page opens)
  const [range] = useState(() => ({ min: pkDay(new Date()), max: pkDay(new Date(Date.now() + NOTICE_MAX_DAYS * DAY)) }));

  useEffect(() => {
    fetch("/api/business/notices")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || "Couldn't load announcements"));
  }, [reload]);

  const now = new Date();
  const live = (data?.notices ?? []).filter(n => isLive(n, now));
  const ended = (data?.notices ?? []).filter(n => !isLive(n, now));
  const shown = new Set(noticesToShow(live, now).map(n => n._id));

  // Auto-save: kept while the form is open, put back when it opens again (also after a reload)
  const draft = useFormDraft(editing && editing !== "new" ? `notice:${editing._id}` : "notice:new", form, setForm, {
    isEmpty: f => (editing === "new" ? !f.title.trim() && !f.body.trim() && !f.link.trim() : JSON.stringify(f) === JSON.stringify(opened)),
    enabled: !!editing,
  });

  function openNew() {
    const blank = emptyForm();
    setForm(blank);
    setOpened(blank);
    setFormError("");
    setEditing("new");
  }
  function openEdit(n: ShopNotice) {
    const saved: Form = {
      kind: n.kind, title: n.title, body: n.body ?? "", eventAt: n.eventAt ? localInput(n.eventAt) : "", endsAt: pkDay(new Date(n.endsAt)),
      link: n.link ?? "", linkLabel: n.linkLabel ?? "", pinned: !!n.pinned,
    };
    setForm(saved);
    setOpened(saved);
    setFormError("");
    setEditing(n);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      kind: form.kind, title: form.title, body: form.body, link: form.link, linkLabel: form.linkLabel, pinned: form.pinned,
      eventAt: form.kind === "EVENT" && form.eventAt ? new Date(form.eventAt).toISOString() : "",
      endsAt: form.endsAt,
    };
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/business/notices" : `/api/business/notices/${(editing as ShopNotice)._id}`, {
      method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) { setFormError(d?.error || "Couldn't save. Please try again."); return; }
    draft.clear();
    setEditing(null);
    setReload(n => n + 1);
  }

  async function patch(n: ShopNotice, body: Record<string, unknown>) {
    setBusy(n._id);
    setError("");
    const res = await fetch(`/api/business/notices/${n._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { setError(d?.error || "Couldn't update. Please try again."); return; }
    setReload(x => x + 1);
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(deleteTarget._id);
    const res = await fetch(`/api/business/notices/${deleteTarget._id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { setError("Couldn't delete. Please try again."); return; }
    setDeleteTarget(null);
    setReload(x => x + 1);
  }

  // The form's card, as it will look on the shop page
  const preview = useMemo<ShopNotice>(() => ({
    _id: "preview", kind: form.kind, title: form.title.trim() || "Your title appears here", body: form.body.trim() || undefined,
    eventAt: form.kind === "EVENT" && form.eventAt ? new Date(form.eventAt).toISOString() : undefined,
    endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59+05:00`).toISOString() : new Date().toISOString(),
    link: form.link.trim() || undefined, linkLabel: form.linkLabel.trim() || undefined, pinned: form.pinned,
    createdAt: editing && editing !== "new" ? editing.createdAt : new Date().toISOString(),
  }), [form, editing]);

  const canEdit = !!data?.canEdit;

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)} title="Delete this announcement?"
        description="It disappears from your shop page and from this list. To only take it off the shop page, use End instead."
        confirmLabel="Delete" loading={!!busy && busy === deleteTarget?._id} onConfirm={remove} />

      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-[var(--gh-0d1117)]">Announcements</h1>
            <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">News, events, offers and notices at the top of your shop page</p>
          </div>
          <div className="flex items-center gap-2">
            {data?.shop && (
              <Link href={`/dealers/${data.shop.slug}`} className={`${iconBtn} h-9 px-3`}><ExternalLink size={14} /> View shop page</Link>
            )}
            {canEdit && (
              <button type="button" onClick={openNew} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                <Plus size={15} /> New announcement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {error && <p role="alert" className="mb-4 rounded-xl bg-[var(--gh-fff0f0)] p-3 text-sm text-[var(--gh-cf222e)]">{error}</p>}
        {!data ? (
          !error && <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : live.length === 0 && ended.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Newspaper size={24} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">Tell customers what&apos;s new</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">New stock, a test-drive day, an Eid offer or new timings: announcements appear at the top of your shop page.</p>
            {canEdit && (
              <button type="button" onClick={openNew} className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus size={15} /> New announcement
              </button>
            )}
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">On your shop page ({live.length})</h2>
            {live.length > SHOP_NOTICES_SHOWN && (
              <p className="mb-3 text-xs text-slate-500">Your shop page shows {SHOP_NOTICES_SHOWN} at a time: pinned first, then the newest. Pin the one that matters most.</p>
            )}
            {live.length === 0 ? (
              <p className="mb-6 rounded-xl bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">Nothing live right now.</p>
            ) : (
              <div className="mb-8 space-y-4">
                {live.map(n => (
                  <div key={n._id}>
                    <ShopNoticeCard notice={n} now={now} />
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                      <span className="mr-auto text-xs text-slate-500">
                        {shown.has(n._id) ? "Showing" : "Waiting for a free place"} · until {shortDate(n.endsAt, now)}
                      </span>
                      {canEdit && (
                        <>
                          <button type="button" onClick={() => patch(n, { pinned: !n.pinned })} disabled={busy === n._id} className={iconBtn}>
                            {n.pinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin</>}
                          </button>
                          <button type="button" onClick={() => openEdit(n)} className={iconBtn}><Pencil size={13} /> Edit</button>
                          <button type="button" onClick={() => patch(n, { action: "end" })} disabled={busy === n._id} className={iconBtn}><Square size={12} /> End</button>
                          <button type="button" onClick={() => setDeleteTarget(n)} aria-label={`Delete ${n.title}`} className={`${iconBtn} text-rose-600`}><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ended.length > 0 && (
              <>
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Ended</h2>
                <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-inset ring-slate-200">
                  {ended.map(n => (
                    <li key={n._id} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{n.title}</span>
                        <span className={`text-xs ${SHOP_NOTICE_KIND[n.kind].text}`}>{SHOP_NOTICE_KIND[n.kind].label}</span>
                        <span className="text-xs text-slate-400"> · ended {shortDate(n.endsAt, now)}</span>
                      </span>
                      {canEdit && (
                        <button type="button" onClick={() => setDeleteTarget(n)} aria-label={`Delete ${n.title}`} className={`${iconBtn} text-rose-600`}><Trash2 size={13} /></button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-400">Ended announcements are removed automatically after 30 days.</p>
              </>
            )}
          </>
        )}
      </div>

      {/* New / edit: the form with a live preview of the card */}
      <Dialog.Root open={!!editing} onOpenChange={o => !o && !saving && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[1001] max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(640px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900">{editing === "new" ? "New announcement" : "Edit announcement"}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-slate-500">Shown at the top of your shop page until the date you choose.</Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <span className={label}>Type</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type">
                  {SHOP_NOTICE_KINDS.map(k => (
                    <button key={k} type="button" role="radio" aria-checked={form.kind === k} onClick={() => setForm(f => ({ ...f, kind: k }))}
                      className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ring-1 ring-inset transition ${form.kind === k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"}`}>
                      {SHOP_NOTICE_KIND[k].label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{SHOP_NOTICE_KIND[form.kind].hint}</p>
              </div>

              <div>
                <label htmlFor="notice-title" className={label}>Title</label>
                <input id="notice-title" value={form.title} maxLength={MAX_NOTICE_TITLE} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 2024 Civics just arrived" className={field} required />
                <p className="mt-1 text-right text-[11px] text-slate-400">{form.title.length}/{MAX_NOTICE_TITLE}</p>
              </div>

              <div>
                <label htmlFor="notice-body" className={label}>Details <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                <textarea id="notice-body" value={form.body} maxLength={MAX_NOTICE_BODY} rows={3} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="What customers should know: prices, timings, what to bring…" className={field} />
                <p className="mt-1 text-right text-[11px] text-slate-400">{form.body.length}/{MAX_NOTICE_BODY}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {form.kind === "EVENT" && (
                  <div>
                    <label htmlFor="notice-event" className={label}>Event date & time</label>
                    <input id="notice-event" type="datetime-local" value={form.eventAt} required
                      onChange={e => setForm(f => ({ ...f, eventAt: e.target.value, endsAt: e.target.value ? e.target.value.slice(0, 10) : f.endsAt }))} className={field} />
                  </div>
                )}
                <div>
                  <label htmlFor="notice-ends" className={label}>Show until</label>
                  <input id="notice-ends" type="date" value={form.endsAt} required min={range.min} max={range.max}
                    onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className={field} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <label htmlFor="notice-link" className={label}>Button link <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                  <input id="notice-link" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="/deals/… or https://…" className={field} />
                </div>
                <div>
                  <label htmlFor="notice-link-label" className={label}>Button text</label>
                  <input id="notice-link-label" value={form.linkLabel} maxLength={30} disabled={!form.link.trim()} onChange={e => setForm(f => ({ ...f, linkLabel: e.target.value }))}
                    placeholder="Learn more" className={`${field} disabled:bg-slate-50 disabled:text-slate-400`} />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-slate-900" />
                <span><span className="font-semibold">Pin to the top</span> <span className="text-slate-500">· stays first on your shop page</span></span>
              </label>

              <div>
                <span className={label}>Preview</span>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
                  <ShopNoticeCard notice={preview} />
                </div>
              </div>

              {formError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{formError}</p>}

              <DraftNote restoredAt={draft.restoredAt} savedAt={draft.savedAt} onDiscard={() => { draft.clear(); setForm(opened); }} />

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close type="button" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Cancel</Dialog.Close>
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  {saving ? "Saving…" : editing === "new" ? "Post announcement" : "Save changes"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
