import { describe, expect, it } from "vitest";
import {
  checkNotice, findNoticeFile, ograUrl, parseAdminPrices, parseNoticeCalendar, parseOgraList, parseOgraPdfText, petroleumUrl,
  priceChange,
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


// Shaped like OGRA's Price Publications page (5 Nov 2026): a label per effective day, then English and Urdu links
const ograPage = `
  <h4>Price Publications (Period November 2026)</h4>
  <p>Price Publication Effective Dated November 05, 2026 <a href="https://ogra.org.pk/index.php/download/17955?lang=en">EN</a>
     <a href="https://ogra.org.pk/index.php/download/17955?lang=ur">UR</a></p>
  <p>Price Publications Effective Dated November 04, 2026 <a href="/index.php/download/17909?lang=en">EN</a> <a href="/index.php/download/17909?lang=ur">UR</a></p>
  <p>Price Publications Effective Dated November 07, 2026 <a href="https://ogra.org.pk/index.php/download/18000?lang=en">EN</a></p>
  <p>Price Publications Effective Dated October 31, 2026 <a href="https://evil.example/index.php/download/1?lang=en">EN</a>
     <a href="https://ogra.org.pk/index.php/download/17814?lang=en">EN</a></p>`;

// The text unpdf gives for OGRA's 5 Nov 2026 publication (shortened; the totals and headings as printed)
const ograPdf = `Price Components Unit 5-Nov-26 Formula Explanation Petrol Platts Arab Gulf Mean Average USD/BBL A 111.45 ...
Total Petrol Price (excl. Secondary Freight*) RS/LTR V={P+S+T+U} 362.00
PETROL (MS) Price Effective November 05,2026
Diesel Platts ... USD/BBL A 128.61 ... Total Diesel Price (excl. Secondary Freight*) RS/LTR W={U+V} 387.81
Diesel (HSD) Price Effective November 05,2026`;

describe("OGRA price publications", () => {
  const at = new Date("2026-11-05T06:00:00Z");
  it("lists each effective day with its English PDF, newest first, on OGRA's site only", () => {
    expect(parseOgraList(ograPage, at)).toEqual([
      { day: "2026-11-05", url: "https://ogra.org.pk/index.php/download/17955?lang=en" },
      { day: "2026-11-04", url: "https://ogra.org.pk/index.php/download/17909?lang=en" },
      { day: "2026-10-31", url: "https://ogra.org.pk/index.php/download/17814?lang=en" },
    ]);
  });
  it("keeps tomorrow (posted the evening before) but not later days", () => {
    expect(parseOgraList(ograPage, new Date("2026-11-06T15:00:00Z"))[0].day).toBe("2026-11-07");
  });
  it("only accepts OGRA addresses", () => {
    expect(ograUrl("https://www.ogra.org.pk/x")).toBe("https://www.ogra.org.pk/x");
    expect(ograUrl("https://ogra.org.pk.evil.com/x")).toBeNull();
  });
  it("reads the petrol and diesel totals and the effective day from the PDF text", () => {
    const raw = parseOgraPdfText(ograPdf);
    expect(raw).toMatchObject({ isPriceNotice: true, effectiveDate: "2026-11-05", petrol: { revised: "362.00" }, diesel: { revised: "387.81" } });
    expect(checkNotice(raw, at).data).toMatchObject({ petrol: 362, diesel: 387.81 });
  });
  it("refuses a PDF whose two headings name different days, or that has no totals", () => {
    expect(parseOgraPdfText(ograPdf.replace("Diesel (HSD) Price Effective November 05", "Diesel (HSD) Price Effective November 04")).isPriceNotice).toBe(false);
    expect(parseOgraPdfText("LPG price notification November 2026").isPriceNotice).toBe(false);
  });
});

