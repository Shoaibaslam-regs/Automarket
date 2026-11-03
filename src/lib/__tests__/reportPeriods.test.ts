import { describe, expect, it } from "vitest";
import { isReportPeriod, pkMonthKey, reportMonths, reportRange } from "@/lib/reportPeriods";

// 3 Nov 2026, 02:00 in Pakistan (still 2 Nov in UTC)
const now = new Date("2026-11-02T21:00:00Z");

describe("reportRange", () => {
  it("uses Pakistan months", () => {
    const r = reportRange("this-month", now);
    expect(r.from.toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-30T19:00:00.000Z");
    expect(reportRange("last-month", now).from.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(reportRange("last-month", now).to.toISOString()).toBe("2026-10-31T19:00:00.000Z");
  });

  it("covers the longer periods up to the end of this month", () => {
    expect(reportRange("last-3", now).from.toISOString()).toBe("2026-08-31T19:00:00.000Z");
    expect(reportRange("this-year", now).from.toISOString()).toBe("2025-12-31T19:00:00.000Z");
  });

  it("accepts only known periods", () => {
    expect(isReportPeriod("last-6")).toBe(true);
    expect(isReportPeriod("forever")).toBe(false);
  });
});

describe("reportMonths", () => {
  it("shows at least six months, ending with the period", () => {
    const months = reportMonths("this-month", now);
    expect(months.map(m => m.key)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(months[5].month).toBe("Nov");
    expect(reportMonths("last-month", now).at(-1)?.key).toBe("2026-10");
    expect(reportMonths("this-year", now)).toHaveLength(11);
  });

  it("puts a record in its Pakistan month", () => {
    expect(pkMonthKey("2026-10-31T19:30:00Z")).toBe("2026-11");
    expect(pkMonthKey("2026-10-31T18:30:00Z")).toBe("2026-10");
  });
});
