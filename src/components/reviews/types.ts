export type ReviewView = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { id: string; name: string; image?: string };
};

export type ReviewSummary = { average: number; count: number };

type RawReview = {
  _id: unknown;
  rating: number;
  comment: string;
  createdAt: Date | string;
  reviewerId?: { _id: unknown; name?: string; image?: string } | null;
};

/** Turns a review document (reviewerId populated) into plain, client-safe data. */
export function toReviewView(r: RawReview): ReviewView {
  return {
    id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    createdAt: new Date(r.createdAt).toISOString(),
    reviewer: {
      id: r.reviewerId ? String(r.reviewerId._id) : "",
      name: r.reviewerId?.name || "AutoMarket user",
      image: r.reviewerId?.image,
    },
  };
}
