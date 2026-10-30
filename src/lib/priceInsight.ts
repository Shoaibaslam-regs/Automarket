// Client-safe "market price check" for the listing page: how a vehicle's asking price compares with other live
// listings of the same make and model from nearby years. Uses the median, so one silly price can't move it.

/** Fewer comparable listings than this and no verdict is shown: too few to say anything fair. */
export const MIN_COMPARABLES = 3;
/** Model years either side of the vehicle's own that still count as comparable. */
export const YEAR_SPREAD = 2;
/** Within this share of the median the price is "fair"; beyond it, good or above market. */
export const FAIR_BAND = 0.07;

export type PriceVerdict = "good" | "fair" | "high";

export type PriceInsight = {
  verdict: PriceVerdict;
  median: number;
  /** The usual range: the 10th to the 90th percentile of comparable prices. */
  low: number;
  high: number;
  count: number;
  /** price − median: negative when cheaper than usual. */
  diff: number;
  /** Where the price sits on the low–high bar, 0 to 1. */
  position: number;
};

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

/** null when there are too few comparable prices to judge. */
export function priceInsight(price: number, comparables: number[]): PriceInsight | null {
  const prices = comparables.filter(p => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (!(price > 0) || prices.length < MIN_COMPARABLES) return null;
  const median = percentile(prices, 0.5);
  const low = percentile(prices, 0.1);
  const high = percentile(prices, 0.9);
  const diff = price - median;
  const share = diff / median;
  const verdict: PriceVerdict = share <= -FAIR_BAND ? "good" : share >= FAIR_BAND ? "high" : "fair";
  const span = high - low;
  const position = span > 0 ? Math.min(1, Math.max(0, (price - low) / span)) : 0.5;
  return { verdict, median, low, high, count: prices.length, diff, position };
}

export const VERDICT_TEXT: Record<PriceVerdict, { label: string; tone: string }> = {
  good: { label: "Good price", tone: "text-emerald-600" },
  fair: { label: "Fair price", tone: "text-sky-600" },
  high: { label: "Above market", tone: "text-amber-600" },
};
