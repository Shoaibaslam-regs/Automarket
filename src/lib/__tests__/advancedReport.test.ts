import { describe, expect, it } from "vitest";
import { changePct, defaultReportDays, parseReportDays, reportCsv } from "@/lib/advancedReport";

const now = new Date("2026-11-03T07:00:00Z"); // 3 Nov, noon in Pakistan

describe("parseReportDays", () => {
  it("covers whole Pakistan days and the same length before", () => {
    const { range } = parseReportDays("2026-10-01", "2026-10-31", now);
    expect(range!.from.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(range!.to.toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(range!.days).toBe(31);
    expect(range!.prevFrom.toISOString()).toBe("2026-08-30T19:00:00.000Z");
    expect(range!.prevTo.toISOString()).toBe(range!.from.toISOString());
  });

  it("allows a single day", () => {
    expect(parseReportDays("2026-11-03", "2026-11-03", now).range!.days).toBe(1);
  });

  it("refuses bad ranges", () => {
    expect(parseReportDays("2026-11-05", "2026-11-01", now).error).toMatch(/before the end/);
    expect(parseReportDays("2026-11-01", "2026-11-04", now).error).toMatch(/after today/);
    expect(parseReportDays("2025-01-01", "2026-11-01", now).error).toMatch(/at most 366/);
    expect(parseReportDays("2026-02-30", "2026-03-01", now).error).toMatch(/Choose a start/);
    expect(parseReportDays(undefined, "2026-03-01", now).error).toBeTruthy();
  });

  it("defaults to this month so far", () => {
    expect(defaultReportDays(now)).toEqual({ from: "2026-11-01", to: "2026-11-03" });
  });
});

describe("changePct and reportCsv", () => {
  it("compares with the previous period", () => {
    expect(changePct(150, 100)).toBe(50);
    expect(changePct(50, 100)).toBe(-50);
    expect(changePct(10, 0)).toBeNull();
  });

  it("writes quoted CSV tables", () => {
    expect(reportCsv([{ title: "Vehicles", rows: [["Name", "Sales"], ['Civic "Oriel"', 2]] }])).toBe('"Vehicles"\n"Name","Sales"\n"Civic ""Oriel""","2"');
  });
});
