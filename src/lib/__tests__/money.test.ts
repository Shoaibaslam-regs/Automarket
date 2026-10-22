import { describe, expect, it } from "vitest";
import { buildSchedule, installmentSummary } from "@/lib/installments";
import { amountDue, paymentState, paymentStateFor } from "@/lib/payments";

describe("amountDue and paymentState", () => {
  const booking = { totalAmount: 5000, deposit: 2000, lateFee: 1000, extraCharges: 500 };
  it("adds rent, deposit, late fee and extra charges", () => {
    expect(amountDue(booking)).toBe(8500);
    expect(amountDue({ totalAmount: 5000, deposit: 0 })).toBe(5000);
  });
  it("tags pending, partly paid and paid from the amount paid", () => {
    expect(paymentState({ ...booking, amountPaid: 0 })).toEqual({ status: "PENDING", paid: 0, due: 8500, balance: 8500 });
    expect(paymentState({ ...booking, amountPaid: 7000 })).toEqual({ status: "PARTIAL", paid: 7000, due: 8500, balance: 1500 });
    expect(paymentState({ ...booking, amountPaid: 8500 }).status).toBe("PAID");
  });
  it("goes back to partly paid when a late fee is added after full payment", () => {
    const paidBefore = amountDue({ totalAmount: 5000, deposit: 2000 });
    expect(paymentState({ totalAmount: 5000, deposit: 2000, lateFee: 1000, amountPaid: paidBefore }).status).toBe("PARTIAL");
  });
  it("never shows a negative balance or payment", () => {
    expect(paymentStateFor(1000, 1500)).toMatchObject({ status: "PAID", balance: 0 });
    expect(paymentStateFor(1000, -50)).toMatchObject({ status: "PENDING", paid: 0 });
  });
});

describe("buildSchedule", () => {
  it("splits what's left after the down payment into equal months", () => {
    const items = buildSchedule(100_000, 10_000, 3, "2026-01-31");
    expect(items.map(i => i.amount)).toEqual([30_000, 30_000, 30_000]);
  });
  it("puts the rounding on the last installment so the total is exact", () => {
    const items = buildSchedule(100, 0, 3, "2026-01-15");
    expect(items.map(i => i.amount)).toEqual([33, 33, 34]);
    expect(items.reduce((n, i) => n + i.amount, 0)).toBe(100);
  });
  it("keeps the day of the month, using the last day in shorter months", () => {
    const days = buildSchedule(90, 0, 3, "2026-01-31").map(i => new Date(i.dueDate).toISOString().slice(0, 10));
    expect(days).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
});

describe("installmentSummary", () => {
  it("counts paid, left, next and overdue", () => {
    const items = buildSchedule(30_000, 0, 3, "2026-01-10").map((i, n) => (n === 0 ? { ...i, paidAt: "2026-01-10" } : i));
    const s = installmentSummary({ downPayment: 0, months: 3, items }, new Date("2026-02-20").getTime())!;
    expect(s).toMatchObject({ total: 3, paidCount: 1, paidAmount: 10_000, left: 20_000, overdueCount: 1, overdueAmount: 10_000, done: false });
    expect(s.next?.index).toBe(1);
  });
  it("is null without a plan", () => {
    expect(installmentSummary(null)).toBeNull();
  });
});
