// Client-safe: Advanced reports (PLAN_FEATURES.advancedReports, Ultimate) on Business → Reports: any range of whole
// days in Pakistan time, compared with the same number of days just before it, and a CSV of the tables.
import { pkDay, pkRange } from "@/lib/money";

/** The longest range one report covers. */
export const MAX_REPORT_DAYS = 366;

const DAY = 86_400_000;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && pkDay(pkRange(v).from) === v;

export type ReportDays = { from: Date; to: Date; days: number; prevFrom: Date; prevTo: Date; fromDay: string; toDay: string };

/**
 * A range from two "YYYY-MM-DD" days, both included (Pakistan time), with the previous period of equal length.
 * Refuses unknown days, a start after the end, a range ending after today or longer than MAX_REPORT_DAYS.
 */
export function parseReportDays(fromDay: unknown, toDay: unknown, now = new Date()): { range?: ReportDays; error?: string } {
  if (!isDay(fromDay) || !isDay(toDay)) return { error: "Choose a start and an end date" };
  if (fromDay > toDay) return { error: "The start date must be before the end date" };
  if (toDay > pkDay(now)) return { error: "The end date can't be after today" };
  const from = pkRange(fromDay).from;
  const to = pkRange(toDay).to;
  const days = Math.round((to.getTime() - from.getTime()) / DAY);
  if (days > MAX_REPORT_DAYS) return { error: `Choose at most ${MAX_REPORT_DAYS} days` };
  return { range: { from, to, days, prevFrom: new Date(from.getTime() - days * DAY), prevTo: from, fromDay, toDay } };
}

/** The default range: the 1st of this month (Pakistan time) to today. */
export function defaultReportDays(now = new Date()): { from: string; to: string } {
  const today = pkDay(now);
  return { from: `${today.slice(0, 8)}01`, to: today };
}

/** Percent change from the previous period, rounded; null when there was nothing before to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** One CSV document from titled tables (each table: a header row, then rows), quoted for spreadsheets. */
export function reportCsv(tables: { title: string; rows: (string | number)[][] }[]): string {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return tables.map(t => [cell(t.title), ...t.rows.map(r => r.map(cell).join(","))].join("\n")).join("\n\n");
}
