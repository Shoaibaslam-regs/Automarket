// Client-safe report reasons and labels (see src/models/Report.ts).

export const REPORT_REASONS = [
  { id: "SCAM", label: "Scam or fraud", hint: "Asks for advance payment, fake documents, or seems like a trick" },
  { id: "FAKE", label: "Fake or stolen vehicle", hint: "The vehicle doesn't exist, isn't theirs, or the photos are copied" },
  { id: "WRONG_INFO", label: "Wrong details or price", hint: "Model, year, mileage or price is misleading" },
  { id: "UNAVAILABLE", label: "Already sold or not available", hint: "It's still listed but can't be bought or rented" },
  { id: "OFFENSIVE", label: "Offensive or inappropriate", hint: "Abusive text, unsuitable photos" },
  { id: "OTHER", label: "Something else", hint: "Tell us what's wrong" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map(r => [r.id, r.label]));

export const REPORT_TARGET_LABEL = { LISTING: "Listing", DEAL: "Deal", BUSINESS: "Business" } as const;

/** Public page of a reported item, for admins to check it. */
export function reportTargetHref(r: { targetType: string; targetId: string; slug?: string }) {
  if (r.targetType === "LISTING") return `/listings/${r.targetId}`;
  if (r.targetType === "DEAL") return `/deals/${r.targetId}`;
  return r.slug ? `/dealers/${r.slug}` : null;
}

/**
 * A listing or deal is hidden automatically once this many different people have open reports on it, until an admin
 * looks (dismissing the reports brings it back). Businesses are never hidden automatically.
 */
export const REPORTS_TO_HIDE = 3;
