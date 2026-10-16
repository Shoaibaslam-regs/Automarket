"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarClock, ExternalLink, Megaphone, Pin } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { ANNOUNCEMENT_LABEL, ANNOUNCEMENT_STYLE, OFFICIAL_NAME, type AnnouncementKind } from "@/lib/announcements";

export type OfficialPost = {
  _id: string; kind: AnnouncementKind; title: string; body: string; link?: string; linkLabel?: string;
  pinned?: boolean; endsAt?: string; createdAt: string; unread?: boolean;
};

const day = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/** "AutoMarket Official" with the blue Verified tick, the same tick verified businesses carry. `tone="dark"` for dark cards. */
export function OfficialName({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 font-bold ${tone === "dark" ? "text-white" : "text-[var(--gh-0d1117)]"} ${className}`}>
      <span className="truncate">{OFFICIAL_NAME}</span>
      <VerifiedBadge variant="icon" size={16} />
    </span>
  );
}

/** The channel's round avatar: the AutoMarket gradient with a megaphone. */
export function OfficialAvatar({ size = 44 }: { size?: number }) {
  return (
    <span className="relative flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 text-white shadow-md"
      style={{ width: size, height: size }}>
      <Megaphone size={Math.round(size * 0.45)} strokeWidth={2.2} />
    </span>
  );
}

/** One post on the AutoMarket Official channel. */
export function OfficialPostCard({ post }: { post: OfficialPost }) {
  const st = ANNOUNCEMENT_STYLE[post.kind] ?? ANNOUNCEMENT_STYLE.ANNOUNCEMENT;
  const [now] = useState(() => Date.now());
  const ended = post.endsAt && new Date(post.endsAt).getTime() < now;
  const external = post.link?.startsWith("https://");
  return (
    <article className={`rounded-2xl border bg-white p-4 sm:p-5 ${post.unread ? "border-indigo-300 ring-2 ring-indigo-100" : "border-[var(--gh-e1e4e8)]"}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <OfficialAvatar size={30} />
        <OfficialName className="text-[13px]" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: st.bg, color: st.color }}>{ANNOUNCEMENT_LABEL[post.kind]}</span>
        {post.pinned && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--gh-57606a)]"><Pin size={10} /> Pinned</span>}
        {post.unread && <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white">NEW</span>}
        <span className="ml-auto text-[11px] text-[var(--gh-8c959f)]">{day(post.createdAt)}</span>
      </div>
      <h3 className="mt-2 text-[15px] font-bold leading-snug text-[var(--gh-0d1117)]">{post.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[var(--gh-57606a)]">{post.body}</p>
      {(post.endsAt || post.link) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {post.link && !ended && (
            external
              ? <a href={post.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-3 py-2 text-xs font-semibold text-white">{post.linkLabel || "Open"} <ExternalLink size={12} /></a>
              : <Link href={post.link} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-3 py-2 text-xs font-semibold text-white">{post.linkLabel || "Open"}</Link>
          )}
          {post.endsAt && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${ended ? "text-[var(--gh-8c959f)]" : "text-[var(--gh-9a6700)]"}`}>
              <CalendarClock size={12} /> {ended ? `Ended ${day(post.endsAt)}` : `Ends ${day(post.endsAt)}`}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/** Follows or unfollows the channel for the business. Returns the error message, or null. */
export async function setFollowOfficial(follow: boolean): Promise<string | null> {
  const res = await fetch("/api/business/official", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ follow }) });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error || "Couldn't update";
}

/**
 * Dashboard card, shown to every business: the newest post from AutoMarket Official (with a "new" count),
 * a Follow button for the owner or a manager when the business doesn't follow yet, and a link to Updates.
 */
export function OfficialDashboardCard() {
  const [data, setData] = useState<{ following: boolean; canChange: boolean; announcements: OfficialPost[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/business/official").then(r => (r.ok ? r.json() : null)).then(d => d && setData(d)).catch(() => {});
  }, []);
  if (!data) return null;
  const unread = data.announcements.filter(a => a.unread);
  const latest = unread[0] ?? data.announcements[0];

  return (
    <div className={`mb-5 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center ${unread.length ? "border-indigo-200" : "border-[var(--gh-e1e4e8)]"}`}>
      <OfficialAvatar size={40} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <OfficialName className="text-[13px]" />
          {unread.length > 0 && <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-extrabold text-white">{unread.length} new</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--gh-57606a)]">
          {latest
            ? <><strong className="font-semibold text-[var(--gh-0d1117)]">{latest.title}</strong> · {day(latest.createdAt)}</>
            : data.following ? "You'll see announcements, new features and offers here." : "Announcements, new features and offers for businesses."}
        </p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        {!data.following && data.canChange && (
          <button disabled={busy} onClick={async () => { setBusy(true); const err = await setFollowOfficial(true); setBusy(false); if (!err) setData({ ...data, following: true }); }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--gh-0d1117)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            <BellRing size={14} /> {busy ? "Following…" : "Follow"}
          </button>
        )}
        <Link href="/business/updates" className="inline-flex items-center justify-center rounded-lg border border-[var(--gh-e1e4e8)] px-3.5 py-2 text-[13px] font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
          {unread.length ? "Read" : "View updates"}
        </Link>
      </div>
    </div>
  );
}
