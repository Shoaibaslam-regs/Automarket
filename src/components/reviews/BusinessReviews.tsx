"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Star, Store } from "lucide-react";
import StarRating from "./StarRating";
import { toReviewView, type ReviewSummary, type ReviewView } from "./types";
import { useRateLock } from "@/hooks/useRateLock";

import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNote from "@/components/ui/DraftNote";
/** anon: signed out · member: works at this business · eligible: may review · ineligible: hasn't dealt with it */
/** "loading" while the browser asks who the visitor is (the business page is cached for everyone) */
export type ReviewViewer = "loading" | "anon" | "member" | "eligible" | "ineligible";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

function ReviewItem({ r, businessName, mine }: { r: ReviewView; businessName: string; mine?: boolean }) {
  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-white">
          {r.reviewer.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-slate-900">{r.reviewer.name}</p>
            {mine && <span className="text-[10px] font-bold text-indigo-700">YOU</span>}
            <span className="text-xs text-slate-400">{fmt(r.createdAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StarRating value={r.rating} size={13} />
            <span className="text-xs font-medium text-slate-500">{RATING_WORDS[r.rating]}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.comment}</p>
          {r.reply && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-200">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Store size={12} /> Reply from {businessName}
                <span className="font-normal text-slate-400">· {fmt(r.reply.repliedAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{r.reply.text}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function BusinessReviews({
  slug,
  businessName,
  viewer,
  initialReviews,
  initialSummary,
  initialHasMore,
  distribution,
  myReview,
}: {
  slug: string;
  businessName: string;
  viewer: ReviewViewer;
  initialReviews: ReviewView[];
  initialSummary: ReviewSummary;
  initialHasMore: boolean;
  /** Count of reviews per star, index 1–5 */
  distribution: number[];
  myReview?: ReviewView;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [dist, setDist] = useState(distribution);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mine, setMine] = useState(myReview);
  const [editing, setEditing] = useState(!myReview);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const revLock = useRateLock("reviews");
  // A first review is kept as a draft per business; editing a posted one isn't
  const draftValue = useMemo(() => ({ rating, comment }), [rating, comment]);
  const draft = useFormDraft(`review:${slug}`, draftValue, d => { setRating(d.rating); setComment(d.comment); },
    { isEmpty: d => !d.rating && !d.comment.trim(), enabled: !mine && viewer !== "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch(`/api/businesses/${slug}/reviews`);
    if (!res.ok) return;
    const data = await res.json();
    const list: ReviewView[] = data.reviews.map(toReviewView);
    setReviews(list);
    setSummary(data.summary);
    setHasMore(data.hasMore);
    setPage(1);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/businesses/${slug}/reviews?page=${page + 1}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(prev => [...prev, ...data.reviews.map(toReviewView)]);
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Choose a star rating"); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/businesses/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    revLock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't save your review"); return; }
    draft.clear();
    const saved = toReviewView(data.review);
    // Keep the star breakdown in step without a reload
    setDist(prev => {
      const next = [...prev];
      if (mine) next[mine.rating] = Math.max(0, next[mine.rating] - 1);
      next[saved.rating] += 1;
      return next;
    });
    setMine(saved);
    setEditing(false);
    refresh();
  }

  async function remove() {
    if (!mine) return;
    setSubmitting(true);
    const res = await fetch(`/api/businesses/${slug}/reviews`, { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) { setError("Couldn't delete your review"); return; }
    setDist(prev => { const next = [...prev]; next[mine.rating] = Math.max(0, next[mine.rating] - 1); return next; });
    setMine(undefined);
    setRating(0);
    setComment("");
    setEditing(true);
    refresh();
  }

  const others = reviews.filter(r => r.id !== mine?.id);
  const total = Math.max(1, dist.reduce((a, b) => a + b, 0));

  return (
    <section id="reviews" className="scroll-mt-24 rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80 sm:p-7">
      <div className="flex items-center gap-2">
        <MessageSquareText size={18} className="text-slate-500" />
        <h2 className="text-lg font-bold text-slate-900">Customer reviews</h2>
      </div>

      {/* Summary */}
      <div className="mt-5 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="text-center sm:text-left">
          <p className="text-5xl font-extrabold tracking-tight text-slate-900">{summary.count ? summary.average.toFixed(1) : "—"}</p>
          <div className="mt-1 flex justify-center sm:justify-start"><StarRating value={summary.average} size={16} /></div>
          <p className="mt-1 text-xs text-slate-500">{summary.count} review{summary.count !== 1 ? "s" : ""}</p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-3 text-right font-medium">{star}</span>
              <Star size={11} className="text-amber-400" fill="currentColor" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${((dist[star] ?? 0) / total) * 100}%` }} />
              </div>
              <span className="w-6 tabular-nums">{dist[star] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write / edit */}
      <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
        {viewer === "loading" ? (
          <div aria-hidden className="h-5 w-2/3 animate-pulse rounded bg-slate-200/70" />
        ) : viewer === "anon" ? (
          <p className="text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-indigo-700 hover:underline">Sign in</Link> to review {businessName}.
          </p>
        ) : viewer === "member" ? (
          <p className="text-sm text-slate-600">You&apos;re part of {businessName}, so you can&apos;t review it. Reply to reviews from your business console.</p>
        ) : viewer === "ineligible" && !mine ? (
          <p className="text-sm text-slate-600">
            Only customers can review {businessName}: book one of its rentals, message its team, or buy from it first.
          </p>
        ) : mine && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Thanks for reviewing {businessName}. Your review is shown below.</p>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">Edit</button>
              <button onClick={remove} disabled={submitting} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 disabled:opacity-50">Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-sm font-semibold text-slate-900">{mine ? "Edit your review" : `How was your experience with ${businessName}?`}</p>
            <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${i} star${i > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setRating(i)}
                  className="p-0.5"
                >
                  <Star size={26} strokeWidth={1.5} className={(hover || rating) >= i ? "text-amber-400" : "text-slate-300"} fill={(hover || rating) >= i ? "currentColor" : "none"} />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-slate-500">{RATING_WORDS[hover || rating]}</span>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Tell others about the vehicle, the service and how they treated you…"
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
            {!mine && <DraftNote className="mt-1" restoredAt={draft.restoredAt} savedAt={draft.savedAt} onDiscard={() => { draft.clear(); setRating(0); setComment(""); }} />}
            {mine?.reply && <p className="mt-1 text-xs text-amber-700">Editing your review removes the business&apos;s current reply.</p>}
            {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={submitting || revLock.locked} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {revLock.locked ? revLock.text : submitting ? "Saving…" : mine ? "Save changes" : "Post review"}
              </button>
              {mine && (
                <button type="button" onClick={() => { setEditing(false); setRating(mine.rating); setComment(mine.comment); setError(""); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* List */}
      {mine || others.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-100">
          {mine && <ReviewItem r={mine} businessName={businessName} mine />}
          {others.map(r => <ReviewItem key={r.id} r={r} businessName={businessName} />)}
        </ul>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-400">No reviews yet.</p>
      )}
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
          {loadingMore ? "Loading…" : "Show more reviews"}
        </button>
      )}
    </section>
  );
}
