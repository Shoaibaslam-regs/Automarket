import { describe, expect, it } from "vitest";
import {
  checkNotice, findNoticeFile, latestOilQuote, parseAdminPrices, parseAlphaSeries, parseNoticeCalendar, petroleumUrl, priceChange,
} from "@/lib/fuelPrices";

const now = new Date("2026-10-09T06:00:00Z");
const cell = (href: string, day: number) => `<td><p><a href="${href}"><span><b><span>${day}</span></b></span></a></p></td>`;

// Shaped like the Petroleum Division's "Petroleum Notifications" calendar: newest month first, day numbers linking
// to NewsDetail pages, and a hand-typed broken link
const calendar = `
  <h3>October, 2026</h3><table><tr>
    ${cell("https://petroleum.gov.pk/NewsDetail/AAA1", 7)}
    ${cell("https://petroleum.gov.pk/NewsDetail/AAA2", 8)}
    ${cell("http://Prices of Petroleum Products on 23rd October, 2026", 9)}
    ${cell("https://petroleum.gov.pk/NewsDetail/FUTURE", 25)}
  </tr></table>
  <h3>September, 2026</h3><table><tr>
    ${cell("https://www.petroleum.gov.pk/NewsDetail/SEP30", 30)}
    ${cell("https://evil.example/NewsDetail/X", 29)}
  </tr></table>`;

describe("the notices calendar", () => {
  it("lists real NewsDetail days newest first, skipping broken, outside and future links", () => {
    expect(parseNoticeCalendar(calendar, now)).toEqual([
      { url: "https://petroleum.gov.pk/NewsDetail/AAA2", day: "2026-10-08" },
      { url: "https://petroleum.gov.pk/NewsDetail/AAA1", day: "2026-10-07" },
      { url: "https://petroleum.gov.pk/NewsDetail/SEP30", day: "2026-09-30" },
    ]);
  });

  it("finds the release image on a detail page, or a PDF", () => {
    expect(findNoticeFile('<img src="/SiteImage/NewsEvents/Petrol_8.10.2026.jpg">')).toEqual({ kind: "image", url: "https://petroleum.gov.pk/SiteImage/NewsEvents/Petrol_8.10.2026.jpg" });
    expect(findNoticeFile('<img src="/SiteImage/NewsEvents/Petrol_3-5 2026.jpg">')?.url).toBe("https://petroleum.gov.pk/SiteImage/NewsEvents/Petrol_3-5%202026.jpg");
    expect(findNoticeFile('<a href="/SiteImage/Misc/files/Notice.pdf">')?.kind).toBe("pdf");
    expect(findNoticeFile('<a href="http://www.surveyofpakistan.gov.pk/SiteImage/Misc/files/political_map_pakistan.pdf">')).toBeNull();
  });

  it("keeps addresses on the Petroleum Division's site, without the broken www host", () => {
    expect(petroleumUrl("https://www.petroleum.gov.pk/NewsDetail/X")).toBe("https://petroleum.gov.pk/NewsDetail/X");
    expect(petroleumUrl("https://evil.example/x")).toBeNull();
  });
});

const notice = {
  isPriceNotice: true, releaseDate: "2026-10-07", effectiveDate: "2026-10-08", previousEffectiveDate: "2026-10-07",
  diesel: { existing: 395.85, revised: 394.94, change: -0.91 },
  petrol: { existing: 394.83, revised: 396.65, change: 1.82 },
};

describe("prices read from a release", () => {
  it("accepts a consistent release (the 8 Oct 2026 one)", () => {
    const r = checkNotice(notice, now);
    expect(r.error).toBeUndefined();
    expect(r.warnings).toEqual([]);
    expect(r.data).toMatchObject({ petrol: 396.65, diesel: 394.94, previousPetrol: 394.83, previousDiesel: 395.85 });
  });

  it("warns when existing + change doesn't give the revised price (a misread digit)", () => {
    const r = checkNotice({ ...notice, petrol: { existing: 394.83, revised: 399.65, change: 1.82 } }, now);
    expect(r.data?.petrol).toBe(399.65);
    expect(r.warnings[0]).toMatch(/Petrol/);
  });

  it("refuses what isn't a believable price release", () => {
    expect(checkNotice({ ...notice, isPriceNotice: false }, now).error).toMatch(/isn't a petrol/);
    expect(checkNotice({ ...notice, petrol: { revised: 39.665 } }, now).error).toMatch(/Petrol/);
    expect(checkNotice({ ...notice, effectiveDate: "2025-01-01" }, now).error).toMatch(/far from today/);
    expect(checkNotice({ ...notice, effectiveDate: "8 Oct" }, now).error).toMatch(/effective date/);
  });
});

describe("prices an admin types", () => {
  it("needs both prices in range, a real day and an https source", () => {
    expect(parseAdminPrices({ petrol: "396.65", diesel: 394.94, effectiveDate: "2026-10-08", sourceUrl: "https://petroleum.gov.pk/NewsDetail/X" }, now).data)
      .toMatchObject({ petrol: 396.65, diesel: 394.94 });
    expect(parseAdminPrices({ petrol: 5, diesel: 394, effectiveDate: "2026-10-08", sourceUrl: "https://x.pk" }, now).error).toMatch(/Petrol/);
    expect(parseAdminPrices({ petrol: 396, diesel: 394, effectiveDate: "2026-02-30", sourceUrl: "https://x.pk" }, now).error).toMatch(/day/);
    expect(parseAdminPrices({ petrol: 396, diesel: 394, effectiveDate: "2026-10-08", sourceUrl: "javascript:alert(1)" }, now).error).toMatch(/https/);
    expect(parseAdminPrices({ petrol: 396, diesel: 394, effectiveDate: "2026-10-08" }, now).error).toMatch(/link/);
    expect(parseAdminPrices({ petrol: 396, diesel: 394, effectiveDate: "2026-10-08" }, now, false).data).toBeTruthy();
  });

  it("works out changes", () => {
    expect(priceChange(394.83, 396.65)).toEqual({ diff: 1.82, pct: 0.46 });
    expect(priceChange(null, 396.65)).toBeNull();
  });
});

describe("Alpha Vantage answers", () => {
  // Shaped like its real BRENT answer: newest first, "." for a missing day
  const brent = { name: "Crude Oil Prices Brent", interval: "daily", unit: "dollars per barrel", data: [
    { date: "2026-10-27", value: "123.1" }, { date: "2026-10-26", value: "128.12" }, { date: "2026-10-25", value: "." }, { date: "2026-10-23", value: "128.3" },
  ] };

  it("reads daily closes oldest first, skipping missing days", () => {
    expect(parseAlphaSeries(brent).points).toEqual([
      { date: "2026-10-23", close: 128.3 }, { date: "2026-10-26", close: 128.12 }, { date: "2026-10-27", close: 123.1 },
    ]);
  });

  it("gives the latest close and its change from the one before", () => {
    expect(latestOilQuote(parseAlphaSeries(brent).points!)).toEqual({ price: 123.1, previousClose: 128.12, change: -5.02, percentChange: -3.92, date: "2026-10-27" });
    expect(latestOilQuote([])).toBeNull();
  });

  it("passes on Alpha Vantage's own messages and rejects nonsense", () => {
    expect(parseAlphaSeries({ Information: "We have detected your API key as invalid" }).error).toMatch(/invalid/);
    expect(parseAlphaSeries({ "Error Message": "Invalid API call" }).error).toMatch(/Invalid/);
    expect(parseAlphaSeries({ data: [{ date: "2026-10-27", value: "0.01" }] }).error).toBeTruthy();
  });
});
