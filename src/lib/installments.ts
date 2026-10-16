// Client-safe helpers for installment (qist) sales: a down payment, then equal monthly payments.

export type Installment = { dueDate: Date | string; amount: number; paidAt?: Date | string | null };
export type InstallmentPlan = { downPayment: number; months: number; items: Installment[]; createdAt?: Date | string };

export const MAX_INSTALLMENT_MONTHS = 60;
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** The same day of the month `n` months after `first` (31 Jan + 1 → 28/29 Feb), at midday Pakistan time. */
function addMonths(first: Date, n: number): Date {
  const y = first.getUTCFullYear(), m = first.getUTCMonth() + n, d = first.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last), 12) - PKT_OFFSET_MS);
}

/**
 * Splits what's left after the down payment into `months` equal installments, rounded to whole rupees
 * (the last one absorbs the rounding). `firstDue` is "YYYY-MM-DD".
 */
export function buildSchedule(price: number, downPayment: number, months: number, firstDue: string): Installment[] {
  const left = Math.max(0, price - downPayment);
  const monthly = Math.floor(left / months);
  const first = new Date(`${firstDue}T00:00:00Z`);
  return Array.from({ length: months }, (_, i) => ({
    dueDate: addMonths(first, i),
    amount: i === months - 1 ? left - monthly * (months - 1) : monthly,
  }));
}

/** Where a plan stands: paid count, the next unpaid installment, and what's overdue (unpaid past its due date). */
export function installmentSummary(plan: InstallmentPlan | null | undefined, now = Date.now()) {
  if (!plan?.items?.length) return null;
  const paid = plan.items.filter(i => i.paidAt);
  const unpaid = plan.items.map((i, index) => ({ ...i, index })).filter(i => !i.paidAt);
  const overdue = unpaid.filter(i => new Date(i.dueDate).getTime() < now);
  return {
    total: plan.items.length,
    paidCount: paid.length,
    paidAmount: paid.reduce((s, i) => s + i.amount, 0),
    left: unpaid.reduce((s, i) => s + i.amount, 0),
    next: unpaid[0] ?? null,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, i) => s + i.amount, 0),
    monthly: plan.items[0].amount,
    done: unpaid.length === 0,
  };
}
