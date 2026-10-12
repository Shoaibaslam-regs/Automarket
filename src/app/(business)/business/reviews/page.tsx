"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquareText, Reply, Star } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerId?: { name?: string } | null;
  reply?: { text: string; repliedAt: string; repliedBy?: { name?: string } | null };
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

export default function BusinessReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [slug, setSlug] = useState<string | null>(null);
  const [canReply, setCanReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNANSWERED" | "LOW">("ALL");
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/business/reviews")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load reviews");
        setReviews(d.reviews || []);
        setSummary(d.summary);
        setSlug(d.slug ?? null);
        setCanReply(!!d.permissions?.canReply);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  async function saveReply(reviewId: string, text: string) {
    setSaving(true);
    setError("");
    const res = await fetch("/api/business/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, text }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Failed to save reply"); return; }
    setReplying(null);
    setDraft("");
    load();
  }

  const shown = reviews.filter(r => filter === "ALL" || (filter === "UNANSWERED" ? !r.reply : r.rating <= 2));
  const unanswered = reviews.filter(r => !r.reply).length;

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <div>
          <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
          <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Reviews</h1>
          <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">What customers say about you on your public business page</p>
        </div>
        {slug && (
          <Link href={`/dealers/${slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
            <ExternalLink size={14} /> View public page
          </Link>
        )}
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
            <p className="text-[11px] text-[var(--gh-8c959f)]">Average rating</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-[var(--gh-0d1117)]">
              {summary.count ? summary.average.toFixed(1) : "—"} <Star size={16} className="text-amber-400" fill="currentColor" />
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
            <p className="text-[11px] text-[var(--gh-8c959f)]">Reviews</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--gh-0d1117)]">{summary.count}</p>
          </div>
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
            <p className="text-[11px] text-[var(--gh-8c959f)]">Awaiting reply</p>
            <p className={`mt-1 text-xl font-extrabold ${unanswered ? "text-[var(--gh-bf8700)]" : "text-[var(--gh-1a7f37)]"}`}>{unanswered}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {([["ALL", "All"], ["UNANSWERED", "Awaiting reply"], ["LOW", "1–2 stars"]] as const).map(([v, t]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs ${filter === v ? "border-[var(--gh-0d1117)] bg-[var(--gh-0d1117)] font-semibold text-white" : "border-[var(--gh-e1e4e8)] bg-white text-[var(--gh-57606a)]"}`}>
              {t}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] px-4 py-3 text-[13px] text-[var(--gh-cf222e)]">{error}</div>}

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-14 text-center">
            <div className="mb-3 flex justify-center text-[var(--gh-8c959f)]"><MessageSquareText size={30} strokeWidth={1.5} /></div>
            <p className="text-sm font-semibold text-[var(--gh-0d1117)]">{reviews.length === 0 ? "No reviews yet" : "Nothing here"}</p>
            <p className="mt-1 text-[13px] text-[var(--gh-57606a)]">Customers who book, buy or message you can review your business.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(r => (
              <div key={r._id} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gh-0d1117)] text-xs font-bold text-white">{r.reviewerId?.name?.[0]?.toUpperCase() ?? "?"}</span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--gh-0d1117)]">{r.reviewerId?.name ?? "AutoMarket user"}</p>
                      <p className="text-[11px] text-[var(--gh-8c959f)]">{fmt(r.createdAt)}</p>
                    </div>
                  </div>
                  <StarRating value={r.rating} size={14} />
                </div>
                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-[var(--gh-24292f)]">{r.comment}</p>

                {replying === r._id ? (
                  <div className="mt-3">
                    <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} maxLength={1000} autoFocus
                      placeholder="Thank them, or explain how you'll make it right. Your reply is public."
                      className="w-full resize-none rounded-lg border border-[var(--gh-d0d7de)] px-3 py-2 text-[13px] outline-none focus:border-[var(--gh-0d1117)] focus:ring-2 focus:ring-[var(--gh-0d1117)]/10" />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => saveReply(r._id, draft)} disabled={saving || !draft.trim()} className="rounded-lg bg-[var(--gh-0d1117)] px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        {saving ? "Saving…" : "Post reply"}
                      </button>
                      <button onClick={() => { setReplying(null); setDraft(""); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--gh-57606a)] hover:bg-[var(--gh-f6f8fa)]">Cancel</button>
                    </div>
                  </div>
                ) : r.reply ? (
                  <div className="mt-3 rounded-xl bg-[var(--gh-f6f8fa)] px-3.5 py-3">
                    <p className="text-xs font-semibold text-[var(--gh-0d1117)]">Your reply{r.reply.repliedBy?.name ? ` · ${r.reply.repliedBy.name}` : ""} <span className="font-normal text-[var(--gh-8c959f)]">· {fmt(r.reply.repliedAt)}</span></p>
                    <p className="mt-1 whitespace-pre-line text-[13px] text-[var(--gh-57606a)]">{r.reply.text}</p>
                    {canReply && (
                      <div className="mt-2 flex gap-3">
                        <button onClick={() => { setReplying(r._id); setDraft(r.reply!.text); }} className="text-xs font-semibold text-[var(--gh-0550ae)] hover:underline">Edit</button>
                        <button onClick={() => saveReply(r._id, "")} disabled={saving} className="text-xs font-semibold text-[var(--gh-cf222e)] hover:underline disabled:opacity-50">Remove</button>
                      </div>
                    )}
                  </div>
                ) : canReply ? (
                  <button onClick={() => { setReplying(r._id); setDraft(""); }} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] px-3 py-1.5 text-xs font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-eef1f4)]">
                    <Reply size={13} /> Reply publicly
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
