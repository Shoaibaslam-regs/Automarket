// Shapes and wording for the admin System usage page (database and UploadThing storage, Gemini calls and emails
// sent). Client-safe.

/** Past this share of a limit the meter turns amber, past DANGER red; the sidebar badge counts both. */
export const USAGE_WARN = 0.8;
export const USAGE_DANGER = 0.95;

/** MongoDB Atlas free (M0) clusters stop accepting writes at 512 MB; DB_STORAGE_LIMIT_MB overrides it for paid tiers. */
export const DEFAULT_DB_LIMIT_MB = 512;

export type UsageLevel = "ok" | "warn" | "danger" | "unknown";

/** Where a meter stands: unknown when there is no limit to compare with. */
export function usageLevel(used: number, limit: number | null | undefined): UsageLevel {
  if (!limit || limit <= 0) return "unknown";
  const share = used / limit;
  if (share >= USAGE_DANGER) return "danger";
  if (share >= USAGE_WARN) return "warn";
  return "ok";
}

/** Share of the limit as a whole percent for the bar and label (0–100, capped; a tiny use shows as "<1%"). */
export function usagePercent(used: number, limit: number | null | undefined): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function percentText(used: number, limit: number | null | undefined): string {
  const p = usagePercent(used, limit);
  if (!limit) return "";
  if (p > 0 && p < 1) return "<1%";
  return `${Math.round(p)}%`;
}

/** "0 B", "812 KB", "3.4 MB", "1.25 GB": 1024-based, like the hosts' own dashboards. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  const digits = i === 0 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")} ${units[i]}`;
}

export type CollectionUsage = { name: string; documents: number; dataBytes: number | null; indexBytes: number | null };

export type DbUsage = {
  ok: true;
  /** What the limit is measured against: data plus indexes (uncompressed), as Atlas counts it for shared tiers */
  usedBytes: number;
  dataBytes: number;
  indexBytes: number;
  /** On-disk size after compression, shown for reference */
  storageBytes: number;
  limitBytes: number;
  documents: number;
  collections: CollectionUsage[];
};

export type UploadUsage = {
  ok: true;
  /** This app's files */
  appBytes: number;
  /** Every app on the UploadThing account; the plan limit applies to this */
  accountBytes: number;
  limitBytes: number;
  files: number;
};

export type UsageFailure = { ok: false; error: string };

/** Counted services (src/lib/usageTracker.ts): one counter per service per Pakistan day. */
export type CountedService = "gemini" | "email";
export type UsageDayRow = { day: string; calls: number; failures: number; tokens: number };

/** Gmail sends about 500 a day; a transactional SMTP service has its own limit (EMAIL_DAILY_LIMIT). */
export const GMAIL_DAILY_LIMIT = 500;
/** Days of counters kept and the bars drawn on the page. */
export const USAGE_KEEP_DAYS = 100;
export const USAGE_CHART_DAYS = 14;

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
/** "YYYY-MM-DD" of a moment in Pakistan time (UTC+5, no daylight saving), the day counters are kept by. */
export const pkDayKey = (d: Date) => new Date(d.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

export type ServiceUsage = {
  ok: true;
  service: CountedService;
  /** Daily limit to compare today with, or null when none is known */
  dailyLimit: number | null;
  today: number;
  week: number;
  month: number;
  /** Failed calls or sends in the last 30 days */
  failures: number;
  /** Gemini tokens in the last 30 days (0 for email) */
  tokens: number;
  /** The last USAGE_CHART_DAYS days, oldest first, every day present (0 when nothing was counted) */
  daily: { day: string; calls: number }[];
};

/** Today, the last 7 and 30 days and the chart from one service's daily rows. */
export function summarizeService(service: CountedService, rows: UsageDayRow[], now: Date, dailyLimit: number | null): ServiceUsage {
  const byDay = new Map(rows.map(r => [r.day, r]));
  const dayAgo = (n: number) => pkDayKey(new Date(now.getTime() - n * 86_400_000));
  const sum = (days: number, pick: (r: UsageDayRow) => number) => {
    let total = 0;
    for (let i = 0; i < days; i++) { const r = byDay.get(dayAgo(i)); if (r) total += pick(r); }
    return total;
  };
  return {
    ok: true,
    service,
    dailyLimit,
    today: byDay.get(dayAgo(0))?.calls ?? 0,
    week: sum(7, r => r.calls),
    month: sum(30, r => r.calls),
    failures: sum(30, r => r.failures),
    tokens: sum(30, r => r.tokens),
    daily: Array.from({ length: USAGE_CHART_DAYS }, (_, i) => {
      const day = dayAgo(USAGE_CHART_DAYS - 1 - i);
      return { day, calls: byDay.get(day)?.calls ?? 0 };
    }),
  };
}

/** "1,234" for counts, "1.2M" for large token totals. */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-PK");
}

export type SystemUsage = {
  checkedAt: string;
  db: DbUsage | UsageFailure;
  uploads: UploadUsage | UsageFailure;
  gemini: ServiceUsage | UsageFailure;
  email: ServiceUsage | UsageFailure;
};

/** How many services are at or past the warning line, for the sidebar badge. */
export function usageAlerts(u: Pick<SystemUsage, "db" | "uploads"> & Partial<Pick<SystemUsage, "gemini" | "email">>): number {
  let n = 0;
  if (u.db.ok && usageLevel(u.db.usedBytes, u.db.limitBytes) !== "ok") n++;
  if (u.uploads.ok && usageLevel(u.uploads.accountBytes, u.uploads.limitBytes) !== "ok") n++;
  // Counted services warn on today's calls against their daily limit; without a limit there is nothing to warn about
  for (const svc of [u.gemini, u.email]) {
    if (svc?.ok && ["warn", "danger"].includes(usageLevel(svc.today, svc.dailyLimit))) n++;
  }
  return n;
}
