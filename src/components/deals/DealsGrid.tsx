"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import DealCard from "@/components/deals/DealCard";
import { DEALS_PAGE_SIZE } from "@/lib/deals";
import type { PublicDeal } from "@/lib/publicDeals";

/**
 * The Deals page grid: the server's first page, then the next DEALS_PAGE_SIZE added automatically as the end of the
 * list comes within about two screens (`GET /api/deals`), with a "Show more deals" button as a fallback. The page
 * gives it a `key` per filter set, so changing a filter starts it again from the first page.
 */
export default function DealsGrid({ initial, total, query, now }: { initial: PublicDeal[]; total: number; query: string; now: number }) {
  const [deals, setDeals] = useState(initial);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMore = deals.length < total;

  function loadMore() {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setLoadingMore(true);
    fetch(`/api/deals?${query ? `${query}&` : ""}page=${next}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        setDeals(prev => {
          // A deal that ended meanwhile shifts the pages by one; skip any card already shown
          const seen = new Set(prev.map(x => x._id));
          return [...prev, ...(d.deals as PublicDeal[]).filter(x => !seen.has(x._id))];
        });
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  const moreRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; });
  useEffect(() => {
    const el = moreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) loadMoreRef.current();
    }, { rootMargin: "0px 0px 1200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {deals.map(d => <DealCard key={d._id} deal={d} now={now} />)}
      </div>
      <div ref={moreRef} className="mt-8 flex flex-col items-center gap-2 text-center">
        {loadingMore ? (
          <p className="flex items-center gap-2 py-2.5 text-sm text-slate-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Loading more deals…
          </p>
        ) : hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
          >
            Show more deals <ChevronDown size={15} />
          </button>
        ) : null}
        <p className="text-xs text-slate-400">
          {hasMore
            ? `Showing ${deals.length} of ${total}`
            : total > DEALS_PAGE_SIZE ? `You've seen all ${total} deals` : null}
        </p>
      </div>
    </>
  );
}
