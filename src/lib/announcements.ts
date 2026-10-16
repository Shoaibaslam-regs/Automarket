// Client-safe names for the AutoMarket Official channel: announcements, updates and offers
// that admins post and businesses who follow the channel receive in Business → Updates.

export const OFFICIAL_NAME = "AutoMarket Official";

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
