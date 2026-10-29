"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BusinessReviews, { type ReviewViewer } from "@/components/reviews/BusinessReviews";
import ReportButton from "@/components/reports/ReportButton";
import type { ReviewView } from "@/components/reviews/types";

/**
 * The business page is cached and served the same to everyone, so the visitor's own review, whether they may
 * write one and whether they're on the team (no Report button) come from `/api/businesses/[slug]/reviews/me`,
 * asked only by signed-in visitors.
 */
type State = { viewer: ReviewViewer; myReview?: ReviewView };

const DealerContext = createContext<State>({ viewer: "loading" });

export function DealerViewerProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const viewerId = session?.user?.id;
  const [loaded, setLoaded] = useState<(State & { for: string }) | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !viewerId) return;
    fetch(`/api/businesses/${encodeURIComponent(slug)}/reviews/me`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setLoaded({ for: viewerId, viewer: d?.viewer ?? "ineligible", myReview: d?.myReview ?? undefined }))
      .catch(() => setLoaded({ for: viewerId, viewer: "ineligible" }));
  }, [status, viewerId, slug]);

  const value: State =
    status === "unauthenticated" ? { viewer: "anon" }
    : status === "authenticated" && loaded && loaded.for === viewerId ? loaded
    : { viewer: "loading" };
  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

/** The reviews section; it starts again once the visitor is known, so the form opens with their own review */
export function DealerReviews(props: Omit<React.ComponentProps<typeof BusinessReviews>, "viewer" | "myReview">) {
  const { viewer, myReview } = useContext(DealerContext);
  return <BusinessReviews key={viewer === "loading" ? "loading" : "known"} {...props} viewer={viewer} myReview={myReview} />;
}

/** Report, hidden from the business's own team and until the visitor is known */
export function DealerReportButton(props: Omit<React.ComponentProps<typeof ReportButton>, "hidden">) {
  const { viewer } = useContext(DealerContext);
  return <ReportButton {...props} hidden={viewer === "loading" || viewer === "member"} />;
}
