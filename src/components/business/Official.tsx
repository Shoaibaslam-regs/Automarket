"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, ExternalLink, Pin } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { ANNOUNCEMENT_LABEL, ANNOUNCEMENT_STYLE, OFFICIAL_NAME, type AnnouncementKind } from "@/lib/announcements";
import StatusText from "@/components/ui/StatusText";

export type OfficialPost = {
  _id: string; kind: AnnouncementKind; title: string; body: string; link?: string; linkLabel?: string;
  pinned?: boolean; endsAt?: string; createdAt: string; unread?: boolean;
};

const day = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/** "AutoGO Official" with the blue Verified tick, the same tick verified businesses carry. `tone="dark"` for dark cards. */
export function OfficialName({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 font-bold ${tone === "dark" ? "text-white" : "text-[var(--gh-0d1117)]"} ${className}`}>
      <span className="truncate">{OFFICIAL_NAME}</span>
      <VerifiedBadge variant="icon" size={16} />
    </span>
  );
}

export function OfficialAvatar({ size = 44 }: { size?: number }) {
  // public/icons/icon-192.png exactly as it is (the installed app's icon), not scaled or cropped
  return (
    <Image src="/icons/icon-192.png" alt="AutoGO" width={size} height={size} unoptimized
      className="theme-static flex-shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10" style={{ width: size, height: size }} />
  );
}

/** One post on the AutoGO Official channel. */
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
        <StatusText color={st.color}>{ANNOUNCEMENT_LABEL[post.kind]}</StatusText>
        {post.pinned && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--gh-57606a)]"><Pin size={10} /> Pinned</span>}
        {post.unread && <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-bold tracking-wide text-white">NEW</span>}
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
 * Dashboard banner, shown to every business: the AutoGO Official icon (as on the Updates page) and name side by side, a thin divider, then "New Update
 * Available!" with the newest unread post (or the latest one), and the button to Updates; a Follow button for the
 * owner or a manager when the business doesn't follow yet. Below lg (phones, and tablets beside the sidebar) the logo
 * row carries the buttons and the text goes underneath, so nothing wraps or overlaps.
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
    <div className={`mb-5 flex flex-col gap-3 rounded-xl border bg-slate-50 px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-5 ${unread.length ? "border-indigo-200 ring-1 ring-inset ring-indigo-100" : "border-[var(--gh-e1e4e8)]"}`}>
      {/* Phones and tablets: the logo and the buttons share one row that never wraps; from lg the row dissolves (contents) and
          its parts take their places in the single line: logo, divider, text, buttons */}
      <div className="flex items-center justify-between gap-2 lg:contents">
        {/* Branding: the same AutoGO Official icon as the Updates page (OfficialAvatar), with the name beside it */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2.5 lg:order-1">
          <OfficialAvatar size={36} />
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-bold tracking-tight text-[var(--gh-0d1117)]">
            AutoGO <VerifiedBadge variant="icon" size={14} />
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2 lg:order-4">
          {!data.following && data.canChange && (
            // Phones show only the bell, so it fits beside the logo with the main button
            <button disabled={busy} aria-label="Follow AutoGO Official" title="Follow AutoGO Official"
              onClick={async () => { setBusy(true); const err = await setFollowOfficial(true); setBusy(false); if (!err) setData({ ...data, following: true }); }}
              className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] text-xs font-semibold text-[var(--gh-0d1117)] transition hover:bg-[var(--gh-f6f8fa)] disabled:opacity-50 sm:h-9 sm:w-auto sm:px-3.5 sm:text-[13px]">
              <BellRing size={14} /> <span className="hidden sm:inline">{busy ? "Following…" : "Follow"}</span>
            </button>
          )}
          <Link href="/business/updates"
            className="group inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--gh-0d1117)] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gh-24292f)] sm:h-9 sm:px-4 sm:text-[13px]">
            {unread.length ? "Update Now" : <><span className="sm:hidden">Updates</span><span className="hidden sm:inline">View updates</span></>} <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <span aria-hidden className="hidden h-10 w-px flex-shrink-0 bg-[var(--gh-e1e4e8)] lg:order-2 lg:block" />

      <div className="min-w-0 lg:order-3 lg:flex-1">
        <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--gh-0d1117)] sm:text-[15px]">
          <span className="truncate">{unread.length ? "New Update Available!" : "Updates from AutoGO"}</span>
          {unread.length > 1 && <span className="flex-shrink-0 rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-bold text-white">{unread.length} new</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--gh-57606a)] sm:text-[13px]">
          {latest
            ? <>{unread.length ? <strong className="font-semibold text-[var(--gh-24292f)]">{latest.title}</strong> : latest.title} · {day(latest.createdAt)}</>
            : "Get the latest features and improvements."}
        </p>
      </div>
    </div>
  );
}
