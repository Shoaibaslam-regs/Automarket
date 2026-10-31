import { describe, expect, it } from "vitest";
import { NOTICE_DEFAULT_DAYS, SHOP_NOTICES_SHOWN, eventText, noticesToShow, parseShopNotice, shortDate } from "@/lib/shopNotices";

// 31 Oct 2026, 15:00 in Pakistan (10:00 UTC)
const now = new Date("2026-10-31T10:00:00Z");
const ok = (b: Record<string, unknown>) => {
  const r = parseShopNotice(b, now);
  if (r.error) throw new Error(r.error);
  return r.data!;
};

describe("parseShopNotice", () => {
  it("accepts a simple news post and shows it for two weeks by default", () => {
    const d = ok({ kind: "NEWS", title: "  New   Civics in stock ", body: "Five 2024 Civics arrived." });
    expect(d.title).toBe("New Civics in stock");
    expect(d.endsAt!.getTime()).toBe(now.getTime() + NOTICE_DEFAULT_DAYS * 86_400_000);
    expect(d.pinned).toBe(false);
  });

  it("needs a date for an event, and shows it until the end of that day", () => {
    expect(parseShopNotice({ kind: "EVENT", title: "Test-drive day" }, now).error).toMatch(/date and time/);
    const d = ok({ kind: "EVENT", title: "Test-drive day", eventAt: "2026-11-08T16:00:00+05:00" });
    expect(d.endsAt!.toISOString()).toBe(new Date("2026-11-08T23:59:59+05:00").toISOString());
  });

  it("keeps a chosen 'show until' day to its end in Pakistan time, within the limits", () => {
    expect(ok({ kind: "OFFER", title: "Eid offer", endsAt: "2026-11-15" }).endsAt!.toISOString()).toBe(new Date("2026-11-15T23:59:59+05:00").toISOString());
    expect(parseShopNotice({ kind: "OFFER", title: "Eid offer", endsAt: "2026-10-30" }, now).error).toMatch(/passed/);
    expect(parseShopNotice({ kind: "OFFER", title: "Eid offer", endsAt: "2027-06-01" }, now).error).toMatch(/at most 90 days/);
  });

  it("refuses bad types, titles and links", () => {
    expect(parseShopNotice({ kind: "AD", title: "Hello" }, now).error).toBeTruthy();
    expect(parseShopNotice({ kind: "NEWS", title: "Hi" }, now).error).toMatch(/title/);
    expect(parseShopNotice({ kind: "NEWS", title: "x".repeat(81) }, now).error).toMatch(/80/);
    expect(parseShopNotice({ kind: "NEWS", title: "Hello", link: "javascript:alert(1)" }, now).error).toMatch(/link/);
    expect(parseShopNotice({ kind: "NEWS", title: "Hello", link: "//evil.example" }, now).error).toMatch(/link/);
    expect(parseShopNotice({ kind: "NEWS", title: "Hello", link: "http://example.com" }, now).error).toMatch(/link/);
  });

  it("keeps AutoGO pages and https links, with a default button label", () => {
    expect(ok({ kind: "NEWS", title: "Hello", link: "/deals/abc" })).toMatchObject({ link: "/deals/abc", linkLabel: "Learn more" });
    expect(ok({ kind: "NEWS", title: "Hello", link: "https://maps.app.goo.gl/x", linkLabel: "Directions" })).toMatchObject({ linkLabel: "Directions" });
  });

  it("only checks the fields sent when editing", () => {
    expect(parseShopNotice({ pinned: true }, now, true)).toEqual({ data: { pinned: true } });
  });
});

describe("noticesToShow", () => {
  const n = (id: string, created: string, ends: string, pinned = false) => ({ _id: id, createdAt: created, endsAt: ends, pinned });
  it("shows live ones, pinned first, then the newest, at most three", () => {
    const list = [
      n("old", "2026-10-01", "2026-11-30"),
      n("ended", "2026-10-29", "2026-10-30"),
      n("pinned", "2026-09-01", "2026-11-30", true),
      n("new", "2026-10-30", "2026-11-30"),
      n("mid", "2026-10-15", "2026-11-30"),
    ];
    expect(noticesToShow(list, now).map(x => x._id)).toEqual(["pinned", "new", "mid"]);
    expect(noticesToShow(list, now)).toHaveLength(SHOP_NOTICES_SHOWN);
  });
});

describe("dates", () => {
  it("writes event times and dates in Pakistan time", () => {
    expect(eventText("2026-11-08T11:00:00Z")).toBe("Sun, 8 Nov · 4:00 PM");
    expect(shortDate("2026-10-31T20:00:00Z", now)).toBe("1 Nov");
    expect(shortDate("2025-12-01T08:00:00Z", now)).toBe("1 Dec 2025");
  });
});

