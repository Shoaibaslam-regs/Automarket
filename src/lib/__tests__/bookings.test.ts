import { describe, expect, it } from "vitest";
import { bookingClashQuery, bookingDailyRate, canTransition, lateCharge, rentalDays, validBookingDates } from "@/lib/bookings";

const d = (s: string) => new Date(s);

describe("rentalDays", () => {
  it("charges at least one day, so same-day and next-day returns are both one day", () => {
    expect(rentalDays("2026-10-23", "2026-10-23")).toBe(1);
    expect(rentalDays("2026-10-23", "2026-10-24")).toBe(1);
    expect(rentalDays("2026-10-23", "2026-10-26")).toBe(3);
  });
});

describe("validBookingDates", () => {
  it("allows a return on the pickup day but not before it", () => {
    expect(validBookingDates("2026-10-23", "2026-10-23")).toBe(true);
    expect(validBookingDates("2026-10-23", "2026-10-22")).toBe(false);
    expect(validBookingDates("not a date", "2026-10-22")).toBe(false);
  });
});

describe("canTransition", () => {
  it("follows PENDING → CONFIRMED → ACTIVE → COMPLETED, with cancel only before handover", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition("ACTIVE", "CANCELLED")).toBe(false);
    expect(canTransition("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransition("NONSENSE", "ACTIVE")).toBe(false);
  });
});

describe("bookingDailyRate", () => {
  it("is the rent divided by the days booked", () => {
    expect(bookingDailyRate({ totalAmount: 10_000, startDate: "2026-10-23", endDate: "2026-10-26" })).toBe(3333);
    expect(bookingDailyRate({ totalAmount: 5_000, startDate: "2026-10-23", endDate: "2026-10-23" })).toBe(5000);
  });
});

describe("lateCharge", () => {
  const due = "2026-10-23T16:00:00+05:00";
  it("is free within the hour of grace", () => {
    expect(lateCharge(due, "2026-10-23T16:50:00+05:00", 5000)).toMatchObject({ lateDays: 0, fee: 0, lateMinutes: 50 });
  });
  it("charges one day once the grace is over", () => {
    expect(lateCharge(due, "2026-10-23T17:30:00+05:00", 5000)).toMatchObject({ lateDays: 1, fee: 5000 });
  });
  it("gives each started 24 hours the same grace", () => {
    expect(lateCharge(due, "2026-10-24T16:30:00+05:00", 5000).lateDays).toBe(1);
    expect(lateCharge(due, "2026-10-24T17:30:00+05:00", 5000)).toMatchObject({ lateDays: 2, fee: 10_000 });
  });
  it("never charges early returns or bookings without a return time", () => {
    expect(lateCharge(due, "2026-10-23T10:00:00+05:00", 5000)).toMatchObject({ lateDays: 0, fee: 0, lateMinutes: 0 });
    expect(lateCharge(undefined, "2026-10-30T10:00:00+05:00", 5000).fee).toBe(0);
  });
});

describe("bookingClashQuery", () => {
  // The same test MongoDB runs, applied to one existing booking
  const clashes = (existing: [string, string], wanted: [string, string]) => {
    const q = bookingClashQuery(d(wanted[0]), d(wanted[1]));
    const [s, e] = existing.map(d);
    return s < q.startDate.$lt && (e > q.$or[0].endDate!.$gt || s >= q.$or[1].startDate!.$gte);
  };
  it("leaves the return day free for the next pickup", () => {
    expect(clashes(["2026-10-23", "2026-10-24"], ["2026-10-24", "2026-10-25"])).toBe(false);
  });
  it("refuses overlapping days", () => {
    expect(clashes(["2026-10-23", "2026-10-25"], ["2026-10-24", "2026-10-26"])).toBe(true);
    expect(clashes(["2026-10-24", "2026-10-26"], ["2026-10-23", "2026-10-25"])).toBe(true);
  });
  it("treats a same-day booking as holding that one day", () => {
    expect(clashes(["2026-10-23", "2026-10-23"], ["2026-10-23", "2026-10-23"])).toBe(true);
    expect(clashes(["2026-10-23", "2026-10-23"], ["2026-10-24", "2026-10-24"])).toBe(false);
    expect(clashes(["2026-10-22", "2026-10-25"], ["2026-10-23", "2026-10-23"])).toBe(true);
  });
});
