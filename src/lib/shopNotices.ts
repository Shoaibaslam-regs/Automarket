// Client-safe rules for shop announcements: news, events, offers and important notices a business posts on its own
// shop page (/dealers/[slug]), managed in Business → Announcements (owner and managers, `announce`).
// Every announcement has a "show until" date, so old ones leave the shop page on their own.

export const SHOP_NOTICE_KINDS = ["NEWS", "EVENT", "OFFER", "NOTICE"] as const;
export type ShopNoticeKind = (typeof SHOP_NOTICE_KINDS)[number];

/** Names, the one-line hint in the form, and colours (text and the card's left bar) for each type. */
export const SHOP_NOTICE_KIND: Record<ShopNoticeKind, { label: string; hint: string; text: string; bar: string }> = {
  NEWS: { label: "News", hint: "New stock, a new branch, anything worth telling", text: "text-indigo-600", bar: "bg-indigo-500" },
  EVENT: { label: "Event", hint: "A test-drive day, a car show, an open house", text: "text-sky-600", bar: "bg-sky-500" },
  OFFER: { label: "Offer", hint: "A discount or a limited-time price", text: "text-amber-600", bar: "bg-amber-500" },
  NOTICE: { label: "Important notice", hint: "Closed for Eid, new timings, a change customers must know", text: "text-rose-600", bar: "bg-rose-500" },
};

export const MAX_NOTICE_TITLE = 80;
export const MAX_NOTICE_BODY = 400;
export const MAX_NOTICE_LINK_LABEL = 30;
/** Live announcements shown on the shop page at once. */
export const SHOP_NOTICES_SHOWN = 3;
/** Announcements a business keeps, live and ended (ended ones are deleted 30 days after they end). */
export const MAX_SHOP_NOTICES = 20;
export const NOTICE_DEFAULT_DAYS = 14;
export const NOTICE_MAX_DAYS = 90;

const DAY = 86_400_000;

export type ShopNotice = {
  _id: string;
  kind: ShopNoticeKind;
  title: string;
  body?: string;
  /** Events: when it happens */
  eventAt?: string;
  /** Leaves the shop page after this */
  endsAt: string;
  link?: string;
  linkLabel?: string;
  pinned?: boolean;
  createdAt: string;
};

export type ShopNoticeInput = {
  kind: ShopNoticeKind;
  title: string;
  body?: string;
  eventAt?: Date;
  endsAt: Date;
  link?: string;
  linkLabel?: string;
  pinned: boolean;
};

const PKT = "Asia/Karachi";

/** "YYYY-MM-DD" of a moment in Pakistan time. */
const pkDay = (d: Date) => new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
/** The end of a Pakistan calendar day ("YYYY-MM-DD"), as a moment (23:59:59 PKT). */
const endOfPkDay = (day: string) => new Date(`${day}T23:59:59+05:00`);

/**
 * Validates a new announcement (or, with `partial`, only the fields sent when editing). A "show until" day is kept to
 * its end in Pakistan time; without one it is NOTICE_DEFAULT_DAYS from now, or the event's own day.
 */
export function parseShopNotice(body: Record<string, unknown>, now = new Date(), partial = false):
  { data: Partial<ShopNoticeInput>; error?: undefined } | { error: string; data?: undefined } {
  const data: Partial<ShopNoticeInput> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has("kind")) {
    const kind = String(body.kind ?? "");
    if (!(SHOP_NOTICE_KINDS as readonly string[]).includes(kind)) return { error: "Choose news, event, offer or important notice" };
    data.kind = kind as ShopNoticeKind;
  }
  if (!partial || has("title")) {
    const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim() : "";
    if (title.length < 3) return { error: "Write a short title" };
    if (title.length > MAX_NOTICE_TITLE) return { error: `Keep the title under ${MAX_NOTICE_TITLE} characters` };
    data.title = title;
  }
  if (!partial || has("body")) {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (text.length > MAX_NOTICE_BODY) return { error: `Keep the details under ${MAX_NOTICE_BODY} characters` };
    data.body = text || undefined;
  }
  if (!partial || has("eventAt")) {
    if (body.eventAt) {
      const at = new Date(String(body.eventAt));
      if (isNaN(at.getTime())) return { error: "Choose the event's date and time" };
      if (at.getTime() < now.getTime() - DAY) return { error: "The event's date has passed" };
      if (at.getTime() > now.getTime() + 365 * DAY) return { error: "The event must be within a year" };
      data.eventAt = at;
    } else data.eventAt = undefined;
  }
  const kind = data.kind ?? (body.kind as ShopNoticeKind | undefined);
  if (!partial && kind === "EVENT" && !data.eventAt) return { error: "Choose the event's date and time" };

  if (!partial || has("endsAt")) {
    let ends: Date;
    if (body.endsAt) {
      const raw = String(body.endsAt);
      ends = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? endOfPkDay(raw) : new Date(raw);
      if (isNaN(ends.getTime())) return { error: "Choose until when to show it" };
    } else {
      ends = data.eventAt ? endOfPkDay(pkDay(data.eventAt)) : new Date(now.getTime() + NOTICE_DEFAULT_DAYS * DAY);
    }
    if (ends.getTime() <= now.getTime()) return { error: "The 'show until' date has passed" };
    if (ends.getTime() > now.getTime() + NOTICE_MAX_DAYS * DAY) return { error: `Show it for at most ${NOTICE_MAX_DAYS} days` };
    data.endsAt = ends;
  }
  if (!partial || has("link")) {
    const link = typeof body.link === "string" ? body.link.trim() : "";
    // An AutoGO page (/…, never //) or an https link: nothing else, so a post can't carry javascript: links
    if (link && !/^\/(?!\/)\S*$/.test(link) && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(link)) {
      return { error: "The button link must be an AutoGO page (starting with /) or start with https://" };
    }
    if (link.length > 500) return { error: "That link is too long" };
    data.link = link || undefined;
    const label = typeof body.linkLabel === "string" ? body.linkLabel.replace(/\s+/g, " ").trim() : "";
    data.linkLabel = link ? (label || "Learn more").slice(0, MAX_NOTICE_LINK_LABEL) : undefined;
  }
  if (!partial || has("pinned")) data.pinned = body.pinned === true;
  return { data };
}

export const isLive = (n: Pick<ShopNotice, "endsAt">, now = new Date()) => new Date(n.endsAt).getTime() > now.getTime();

/** What the shop page shows: live ones, pinned first, then the newest, at most SHOP_NOTICES_SHOWN. */
export function noticesToShow<T extends Pick<ShopNotice, "endsAt" | "pinned" | "createdAt">>(list: T[], now = new Date()): T[] {
  return list
    .filter(n => isLive(n, now))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, SHOP_NOTICES_SHOWN);
}

/** "Sun, 8 Nov · 4:00 PM" in Pakistan time. */
export function eventText(at: string | Date): string {
  const d = new Date(at);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: PKT });
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: PKT });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: PKT });
  return `${weekday}, ${day} · ${time}`;
}

/** "31 Oct" (and the year when it isn't this year), in Pakistan time. */
export function shortDate(at: string | Date, now = new Date()): string {
  const d = new Date(at);
  const sameYear = d.toLocaleDateString("en-GB", { year: "numeric", timeZone: PKT }) === now.toLocaleDateString("en-GB", { year: "numeric", timeZone: PKT });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: PKT });
}
