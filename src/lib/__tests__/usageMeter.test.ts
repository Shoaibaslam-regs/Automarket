import { describe, expect, it } from "vitest";
import { GMAIL_DAILY_LIMIT, USAGE_CHART_DAYS, formatBytes, formatCount, percentText, pkDayKey, summarizeService, usageAlerts, usageLevel, usagePercent, type DbUsage, type UploadUsage } from "@/lib/usageMeter";

const MB = 1024 * 1024;

describe("usageLevel", () => {
  it("is ok below 80%, warn from 80% and danger from 95%", () => {
    expect(usageLevel(400 * MB, 512 * MB)).toBe("ok");
    expect(usageLevel(410 * MB, 512 * MB)).toBe("warn");
    expect(usageLevel(487 * MB, 512 * MB)).toBe("danger");
    expect(usageLevel(600 * MB, 512 * MB)).toBe("danger");
  });
  it("is unknown without a limit", () => {
    expect(usageLevel(5, 0)).toBe("unknown");
    expect(usageLevel(5, null)).toBe("unknown");
  });
});

describe("usagePercent and percentText", () => {
  it("caps at 100 and rounds the label", () => {
    expect(usagePercent(2, 1)).toBe(100);
    expect(percentText(212 * MB, 512 * MB)).toBe("41%");
  });
  it("shows a tiny use as <1% instead of 0%", () => {
    expect(percentText(1 * MB, 2048 * MB)).toBe("<1%");
    expect(percentText(0, 512 * MB)).toBe("0%");
  });
});

describe("formatBytes", () => {
  it("uses 1024-based units with sensible digits", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(3.4 * MB)).toBe("3.4 MB");
    expect(formatBytes(212 * MB)).toBe("212 MB");
    expect(formatBytes(2 * 1024 * MB)).toBe("2 GB");
    expect(formatBytes(1.25 * 1024 * MB)).toBe("1.25 GB");
  });
});

describe("usageAlerts", () => {
  const db = (used: number): DbUsage => ({ ok: true, usedBytes: used, dataBytes: used, indexBytes: 0, storageBytes: used, limitBytes: 512 * MB, documents: 0, collections: [] });
  const up = (used: number): UploadUsage => ({ ok: true, appBytes: used, accountBytes: used, limitBytes: 2048 * MB, files: 0 });
  it("counts each service at or past the warning line", () => {
    expect(usageAlerts({ db: db(100 * MB), uploads: up(100 * MB) })).toBe(0);
    expect(usageAlerts({ db: db(450 * MB), uploads: up(100 * MB) })).toBe(1);
    expect(usageAlerts({ db: db(500 * MB), uploads: up(2000 * MB) })).toBe(2);
  });
  it("ignores a service that couldn't be read", () => {
    expect(usageAlerts({ db: { ok: false, error: "x" }, uploads: up(2000 * MB) })).toBe(1);
  });
});

describe("counted services (Gemini, email)", () => {
  // 30 Oct 2026, 21:00 in Pakistan (16:00 UTC)
  const now = new Date("2026-10-30T16:00:00Z");
  const rows = [
    { day: "2026-10-30", calls: 120, failures: 2, tokens: 50_000 },
    { day: "2026-10-28", calls: 30, failures: 0, tokens: 10_000 },
    { day: "2026-10-10", calls: 400, failures: 5, tokens: 0 },
    { day: "2026-08-01", calls: 999, failures: 9, tokens: 0 },
  ];

  it("keeps days in Pakistan time", () => {
    expect(pkDayKey(new Date("2026-10-30T19:30:00Z"))).toBe("2026-10-31");
    expect(pkDayKey(new Date("2026-10-30T18:59:00Z"))).toBe("2026-10-30");
  });

  it("adds up today, the last 7 and 30 days, and fills every chart day", () => {
    const s = summarizeService("email", rows, now, 500);
    expect(s).toMatchObject({ today: 120, week: 150, month: 550, failures: 7, tokens: 60_000, dailyLimit: 500 });
    expect(s.daily).toHaveLength(USAGE_CHART_DAYS);
    expect(s.daily[USAGE_CHART_DAYS - 1]).toEqual({ day: "2026-10-30", calls: 120 });
    expect(s.daily[USAGE_CHART_DAYS - 3]).toEqual({ day: "2026-10-28", calls: 30 });
    expect(s.daily[0].calls).toBe(0);
  });

  it("warns on today's count against the daily limit only", () => {
    const base = { db: { ok: false as const, error: "" }, uploads: { ok: false as const, error: "" } };
    expect(usageAlerts({ ...base, email: summarizeService("email", [{ day: "2026-10-30", calls: 450, failures: 0, tokens: 0 }], now, GMAIL_DAILY_LIMIT) })).toBe(1);
    expect(usageAlerts({ ...base, email: summarizeService("email", rows, now, GMAIL_DAILY_LIMIT) })).toBe(0);
    expect(usageAlerts({ ...base, gemini: summarizeService("gemini", [{ day: "2026-10-30", calls: 9999, failures: 0, tokens: 0 }], now, null) })).toBe(0);
  });

  it("shortens big counts", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(250_000)).toBe("250K");
    expect(formatCount(1_500_000)).toBe("1.5M");
    expect(formatCount(2_000_000)).toBe("2M");
  });
});
