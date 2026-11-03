// Client-safe: the periods Business → Reports can show, in Pakistan time (UTC+5, no daylight saving), like the cash
// book (src/lib/money.ts). Counts of what the business has now (vehicles, customers) aren't tied to a period; sales
// and rental income are.

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const REPORT_PERIODS = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3", label: "Last 3 months" },
  { key: "last-6", label: "Last 6 months" },
  { key: "this-year", label: "This year" },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]["key"];

export function isReportPeriod(v: unknown): v is ReportPeriod {
  return REPORT_PERIODS.some(p => p.key === v);
}

/** Midnight of the 1st of the month `offset` months from (y, m), Pakistan time, as a real instant. */
function monthStart(y: number, m: number, offset = 0): Date {
  return new Date(Date.UTC(y, m + offset, 1) - PKT_OFFSET_MS);
}

/** The Pakistan calendar year and month (0-11) of an instant. */
function pkYearMonth(d: Date): { y: number; m: number } {
  const p = new Date(d.getTime() + PKT_OFFSET_MS);
  return { y: p.getUTCFullYear(), m: p.getUTCMonth() };
}

/** The instants a period covers: `from` inclusive, `to` exclusive (the end of today's month, or of last month). */
export function reportRange(period: ReportPeriod, now = new Date()): { from: Date; to: Date; label: string } {
  const { y, m } = pkYearMonth(now);
  const label = REPORT_PERIODS.find(p => p.key === period)!.label;
  const end = monthStart(y, m, 1);
  switch (period) {
    case "last-month": return { from: monthStart(y, m, -1), to: monthStart(y, m), label };
    case "last-3": return { from: monthStart(y, m, -2), to: end, label };
    case "last-6": return { from: monthStart(y, m, -5), to: end, label };
    case "this-year": return { from: monthStart(y, 0), to: end, label };
    default: return { from: monthStart(y, m), to: end, label };
  }
}

/** The months a chart shows for a period: at least the 6 months ending with it, each as "YYYY-MM" plus a short name. */
export function reportMonths(period: ReportPeriod, now = new Date()): { key: string; month: string; from: Date; to: Date }[] {
  const { from, to } = reportRange(period, now);
  const last = pkYearMonth(new Date(to.getTime() - 1));
  const first = pkYearMonth(from);
  const span = Math.max(6, (last.y - first.y) * 12 + (last.m - first.m) + 1);
  return Array.from({ length: span }, (_, i) => {
    const start = monthStart(last.y, last.m, i - span + 1);
    const { y, m } = pkYearMonth(start);
    return {
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      month: new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      from: start,
      to: monthStart(y, m, 1),
    };
  });
}

/** "YYYY-MM" of an instant in Pakistan time, to put a record in its chart month. */
export function pkMonthKey(d: Date | string): string {
  const { y, m } = pkYearMonth(new Date(d));
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
