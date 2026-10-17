"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, BellRing, Check, Megaphone } from "lucide-react";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import { OFFICIAL_NAME } from "@/lib/announcements";
import { OfficialAvatar, OfficialName, OfficialPostCard, setFollowOfficial, type OfficialPost } from "@/components/business/Official";
import ConfirmDialog from "@/components/business/ConfirmDialog";
import Tip from "@/components/ui/Tip";

type Feed = { following: boolean; followers: number; canChange: boolean; announcements: OfficialPost[] };

/** Business → Updates: the AutoMarket Official channel (announcements, updates and offers from the AutoMarket team). */
export default function UpdatesPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  useEffect(() => {
    // Opening the page marks the posts as read, so the sidebar badge clears
    fetch("/api/business/official?seen=1")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setFeed(d); refreshNotificationCounts(); })
      .catch(e => setError(e.message || "Couldn't load updates"));
  }, []);

  async function change(follow: boolean) {
    if (!feed) return;
    setBusy(true);
    setError("");
    const err = await setFollowOfficial(follow);
    setBusy(false);
    if (err) { setError(err); return; }
    setConfirmUnfollow(false);
    setFeed({ ...feed, following: follow, followers: feed.followers + (follow ? 1 : -1), announcements: feed.announcements.map(a => ({ ...a, unread: false })) });
  }

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <ConfirmDialog open={confirmUnfollow} onOpenChange={setConfirmUnfollow} title={`Unfollow ${OFFICIAL_NAME}?`}
        description="Your team will stop getting notifications about announcements, new features and offers. You can follow again at any time."
        confirmLabel="Unfollow" loadingLabel="Unfollowing..." loading={busy} onConfirm={() => change(false)} />

      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Updates</h1>
        <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Announcements, new features and offers from the AutoMarket team</p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
        {error && <p role="alert" className="mb-4 rounded-xl bg-[var(--gh-fff0f0)] p-3 text-sm text-[var(--gh-cf222e)]">{error}</p>}
        {!feed ? (
          !error && <div className="h-48 animate-pulse rounded-2xl bg-white" />
        ) : (
          <>
            {/* Channel card */}
            <div className="theme-static mb-5 overflow-hidden rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex flex-wrap items-center gap-4">
                <OfficialAvatar size={56} />
                <div className="min-w-[calc(100%-72px)] flex-1 sm:min-w-0">
                  <OfficialName tone="dark" className="text-base" />
                  <p className="text-xs text-slate-400">The AutoMarket team · {feed.followers.toLocaleString()} business{feed.followers !== 1 ? "es" : ""} following <Tip id="official" size={12} /></p>
                </div>
                {feed.following ? (
                  feed.canChange ? (
                    <button onClick={() => setConfirmUnfollow(true)} disabled={busy}
                      className="group inline-flex w-full items-center justify-center gap-1.5 sm:w-auto rounded-lg bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/20 hover:bg-white/15">
                      <Check size={14} className="group-hover:hidden" /><BellOff size={14} className="hidden group-hover:block" /> Following
                    </button>
                  ) : <span className="inline-flex w-full items-center justify-center gap-1.5 sm:w-auto rounded-lg bg-white/10 px-3.5 py-2 text-[13px] font-semibold"><Check size={14} /> Following</span>
                ) : feed.canChange ? (
                  <button onClick={() => change(true)} disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-1.5 sm:w-auto rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-[13px] font-bold text-slate-950 disabled:opacity-60">
                    <BellRing size={14} /> {busy ? "Following…" : "Follow"}
                  </button>
                ) : null}
              </div>
              {!feed.following && (
                <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300 ring-1 ring-inset ring-white/10">
                  {feed.canChange
                    ? "Follow to get a notification in your console whenever the AutoMarket team posts something important, a new feature, or an offer for businesses."
                    : "Your business doesn't follow this channel yet. Ask your owner or a manager to follow it to get notifications."}
                </p>
              )}
            </div>

            {feed.announcements.length === 0 ? (
              <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-12 text-center">
                <Megaphone size={26} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--gh-8c959f)]" />
                <p className="text-sm font-semibold text-[var(--gh-0d1117)]">No posts yet</p>
                <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Announcements and offers from the AutoMarket team will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.announcements.map(a => <OfficialPostCard key={a._id} post={a} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
