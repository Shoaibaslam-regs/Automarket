// Client-safe helpers for sponsored ads (the Ad model). Prices are in SPONSORED_AD (src/lib/plans.ts).

export type AdKind = "SHOP" | "DEAL" | "LISTING";

/** Cities are compared without case or extra spaces ("lahore " = "Lahore") */
export const sameCity = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

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

/** What adPreviewTips looks at, from sponsoredPreview (src/lib/sponsored.ts). */
export type AdPreviewFacts = {
  kind: AdKind; verified: boolean; hasLogo: boolean; hasDescription: boolean; hasCity: boolean; photos: number; title: string;
};
export type AdPreviewTip = { text: string; href?: string; link?: string };

/** About this many characters of a title fit on the card before it's cut with "…". */
export const AD_CARD_TITLE_FITS = 28;

/**
 * Business → Promote: what to fix before paying, for the card the preview shows. Only things that change how the
 * card looks or how often it's shown. `targetId` is the deal or vehicle, for its edit link.
 */
export function adPreviewTips(f: AdPreviewFacts, targetId?: string): AdPreviewTip[] {
  const tips: AdPreviewTip[] = [];
  const settings = "/business/settings";
  const edit = f.kind === "DEAL" ? `/business/deals/${targetId}/edit` : `/sell/edit/${targetId}`;
  if (f.kind === "SHOP") {
    if (!f.hasLogo) tips.push({ text: "Your business has no logo, so the card shows a plain building icon.", href: settings, link: "Add a logo" });
    if (!f.hasDescription) tips.push({ text: "Without a description the card uses a standard line about your shop.", href: settings, link: "Write a short description" });
  } else if (f.photos === 0) {
    tips.push({ text: `This ${f.kind === "DEAL" ? "deal" : "vehicle"} has no photo, so the card's picture is blank.`, href: targetId ? edit : undefined, link: "Add photos" });
  } else if (f.kind === "LISTING" && f.photos > 1) {
    tips.push({ text: "The card shows your main photo. Pick your best one with Set as main.", href: targetId ? edit : undefined, link: "Edit photos" });
  }
  if (f.title.length > AD_CARD_TITLE_FITS) {
    tips.push({ text: `Long titles are cut on the card, so buyers see "${f.title.slice(0, AD_CARD_TITLE_FITS).trimEnd()}…".` });
  }
  if (!f.hasCity) tips.push({ text: "Your business has no city, so the ad isn't shown first to buyers near you.", href: settings, link: "Add your city" });
  if (!f.verified) tips.push({ text: "Verified businesses get more turns among Standard ads, and a tick on the card.", href: "/pricing#verified", link: "About the Verified badge" });
  return tips;
}
