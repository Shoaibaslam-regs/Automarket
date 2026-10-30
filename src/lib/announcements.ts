// Client-safe names for the AutoGO Official channel: announcements, updates and offers
// that admins post and businesses who follow the channel receive in Business → Updates.

export const OFFICIAL_NAME = "AutoGO Official";

export const ANNOUNCEMENT_KINDS = ["ANNOUNCEMENT", "UPDATE", "OFFER"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_LABEL: Record<AnnouncementKind, string> = {
  ANNOUNCEMENT: "Announcement",
  UPDATE: "Update",
  OFFER: "Offer",
};

/** Theme colours for each kind's chip. */
export const ANNOUNCEMENT_STYLE: Record<AnnouncementKind, { bg: string; color: string }> = {
  ANNOUNCEMENT: { bg: "var(--gh-ddf4ff)", color: "var(--gh-0550ae)" },
  UPDATE: { bg: "var(--gh-dafbe1)", color: "var(--gh-1a7f37)" },
  OFFER: { bg: "var(--gh-fff8c5)", color: "var(--gh-7d4e00)" },
};

export const MAX_TITLE = 120;
export const MAX_BODY = 2000;

/**
 * A button link that points at AutoGO itself ("https://autogo-pak.vercel.app/pricing") as a path ("/pricing"), so it
 * opens in the same window. Opened as an outside link it got a new window without a referrer, which the installed
 * app opened as a second window. Other links come back unchanged.
 */
export function ownSitePath(link: string, ownHosts: (string | null | undefined)[]): string {
  if (!/^https:\/\//i.test(link)) return link;
  try {
    const url = new URL(link);
    const hosts = ownHosts.filter(Boolean).map(h => h!.toLowerCase());
    if (!hosts.includes(url.host.toLowerCase())) return link;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    return link;
  }
}
