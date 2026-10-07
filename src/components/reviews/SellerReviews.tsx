"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, MessageSquareText } from "lucide-react";
import StarRating from "./StarRating";
import { toReviewView, type ReviewSummary, type ReviewView } from "./types";

type Viewer = "anon" | "owner" | "eligible" | "ineligible";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function SellerReviews({
  sellerId,
  listingId,
  sellerName,
  viewer,
  initialReviews,
  initialSummary,
  initialHasMore,
  myReview,
}: {
  sellerId: string;
  listingId: string;
  sellerName: string;
  viewer: Viewer;
  initialReviews: ReviewView[];
  initialSummary: ReviewSummary;
  initialHasMore: boolean;
  myReview?: ReviewView;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mine, setMine] = useState(myReview);
  const [editing, setEditing] = useState(!myReview);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch(`/api/reviews?sellerId=${sellerId}`);
    if (!res.ok) return;
    const data = await res.json();
    setReviews(data.reviews.map(toReviewView));
    setSummary(data.summary);
    setHasMore(data.hasMore);
    setPage(1);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/reviews?sellerId=${sellerId}&page=${page + 1}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(r => [...r, ...data.reviews.map(toReviewView)]);
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Please choose a star rating");
    if (comment.trim().length < 10) return setError("Please write at least 10 characters");
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, listingId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save your review");
      setMine(toReviewView(data.review));
      setEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your review");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!confirm("Delete your review?")) return;
    const res = await fetch(`/api/reviews?sellerId=${sellerId}`, { method: "DELETE" });
    if (!res.ok) return setError("Couldn't delete your review");
    setMine(undefined);
    setRating(0);
    setComment("");
    setEditing(true);
    await refresh();
  }

  const shown = hover || rating;

  return (
    <div id="reviews" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Seller reviews</h2>
          <p className="mt-0.5 text-sm text-gray-500">What buyers and renters say about {sellerName}</p>
        </div>
        {summary.count > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-bold tracking-tight text-gray-900">{summary.average.toFixed(1)}</span>
            <div>
              <StarRating value={summary.average} size={15} />
              <p className="mt-0.5 text-xs text-gray-500">
                {summary.count} review{summary.count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Write / edit */}
      {viewer === "eligible" && (editing ? (
        <form onSubmit={submit} className="mb-6 rounded-xl bg-gray-50 p-4 ring-1 ring-inset ring-gray-200">
          <p className="text-sm font-medium text-gray-800">{mine ? "Edit your review" : `Rate your experience with ${sellerName}`}</p>
          <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                aria-label={`${i} star${i > 1 ? "s" : ""}`}
                aria-pressed={rating === i}
                className="p-0.5 transition hover:scale-110"
              >
                <Star size={24} strokeWidth={1.5} fill={i <= shown ? "currentColor" : "none"} className={i <= shown ? "text-amber-400" : "text-gray-300"} />
              </button>
            ))}
            {shown > 0 && <span className="ml-2 text-xs font-medium text-gray-500">{RATING_WORDS[shown]}</span>}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="How was the deal? Was the vehicle as described? Was the seller responsive?"
            className="mt-3 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          {error && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="mr-auto text-[11px] text-gray-400">{comment.trim().length}/1000</span>
            {mine && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Saving…" : mine ? "Update review" : "Post review"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <span>Thanks for reviewing {sellerName}.</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => setEditing(true)} className="font-semibold hover:underline">Edit</button>
            <button type="button" onClick={remove} className="font-semibold text-rose-600 hover:underline">Delete</button>
          </span>
        </div>
      ))}
      {viewer === "ineligible" && (
        <p className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-inset ring-gray-200">
          You can review {sellerName} after you&apos;ve messaged them or booked one of their rentals.
        </p>
      )}
      {viewer === "anon" && (
        <p className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-inset ring-gray-200">
          <Link href="/login" className="font-semibold text-gray-900 hover:underline">Sign in</Link> to review this seller after dealing with them.
        </p>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <div className="py-8 text-center">
          <MessageSquareText size={28} strokeWidth={1.5} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No reviews yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {reviews.map(r => (
            <li key={r.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {r.reviewer.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {r.reviewer.name}
                    {mine && r.id === mine.id && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} size={12} />
                    <span className="text-[11px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-5 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Show more reviews"}
        </button>
      )}
    </div>
  );
}
