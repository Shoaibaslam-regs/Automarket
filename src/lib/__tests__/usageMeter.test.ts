import { describe, expect, it } from "vitest";
import { formatBytes, percentText, usageAlerts, usageLevel, usagePercent, type DbUsage, type UploadUsage } from "@/lib/usageMeter";

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
