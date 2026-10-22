// Client-safe helpers for sponsored ads (the Ad model). Prices are in SPONSORED_AD (src/lib/plans.ts).

export type AdKind = "SHOP" | "DEAL" | "LISTING";

export const AD_KIND_LABEL: Record<AdKind, string> = {
  SHOP: "Business page",
  DEAL: "Deal",
  LISTING: "Vehicle",
};

/** Where an ad sends people: the business page, the deal or the listing. */
export function adHref(ad: { kind: AdKind; targetId?: string | null }, slug?: string | null): string | null {
  if (ad.kind === "SHOP") return slug ? `/dealers/${slug}` : null;
  if (!ad.targetId) return null;
  return ad.kind === "DEAL" ? `/deals/${ad.targetId}` : `/listings/${ad.targetId}`;
}

export type AdState = "REQUESTED" | "SCHEDULED" | "RUNNING" | "ENDED" | "REJECTED" | "CANCELLED" | "STOPPED";

/** Where an ad stands now: approved ads are scheduled, running or ended depending on their dates. */
export function adState(ad: { status: string; startsAt?: string | Date | null; endsAt?: string | Date | null }, now = Date.now()): AdState {
  if (ad.status !== "APPROVED") return ad.status as AdState;
  if (ad.endsAt && new Date(ad.endsAt).getTime() <= now) return "ENDED";
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return "SCHEDULED";
  return "RUNNING";
}

export const AD_STATE_LABEL: Record<AdState, string> = {
  REQUESTED: "Waiting for approval",
  SCHEDULED: "Approved, starts soon",
  RUNNING: "Running",
  ENDED: "Ended",
  REJECTED: "Refused",
  CANCELLED: "Cancelled",
  STOPPED: "Stopped",
};

/** Tailwind text colours for StatusText */
export const AD_STATE_TONE: Record<AdState, string> = {
  REQUESTED: "text-amber-600",
  SCHEDULED: "text-sky-600",
  RUNNING: "text-emerald-600",
  ENDED: "text-slate-500",
  REJECTED: "text-rose-600",
  CANCELLED: "text-slate-500",
  STOPPED: "text-rose-600",
};

export const DAY_MS = 24 * 60 * 60 * 1000;
