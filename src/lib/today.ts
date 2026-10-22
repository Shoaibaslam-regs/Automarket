// Client-safe shape of the business console's "Today" list (GET /api/business/today).

export type TodayKind = "bookingRequest" | "pickup" | "return" | "deposit" | "saleRequest" | "installment" | "followUp";

export type TodayItem = {
  kind: TodayKind;
  id: string;
  title: string;
  subtitle: string;
  /** When it's due (ISO) */
  at: string;
  overdue: boolean;
  /** The page that handles it, with the booking or sale number pre-searched */
  href: string;
  /** Label for the button, e.g. "Hand over" */
  action: string;
};

/** What the daily cron's morning notification counts for one person (src/lib/dailyJobs.ts) */
export type DigestCounts = { pickups: number; returns: number; installments: number; followUps: number };

/** "2 returns due · 1 installment due", or "" when there's nothing */
export function digestText(c: DigestCounts): string {
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  return [
    part(c.returns, "return due", "returns due"),
    part(c.pickups, "pickup", "pickups"),
    part(c.installments, "installment due", "installments due"),
    part(c.followUps, "follow-up", "follow-ups"),
  ].filter(Boolean).join(" · ");
}
