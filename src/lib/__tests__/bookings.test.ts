import { describe, expect, it } from "vitest";
import { PERSONAL_OWNER_MOVES, RENTER_MOVES, MAX_BOOKING_DAYS, REQUEST_EXPIRY_HOURS, bookingClashQuery, bookingDailyRate, bookingLengthError, canTransition, CANCEL_REASON_TEXT, cancelReasonOf, heldDays, holdsDatesQuery, lateCharge, needsTakenDay, rentalDays, requestExpiryCutoff, validBookingDates } from "@/lib/bookings";

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

describe("online request limits", () => {
  it("allows up to MAX_BOOKING_DAYS and refuses longer", () => {
    expect(bookingLengthError("2026-11-01", "2026-12-01")).toBeNull(); // 30 days
    expect(bookingLengthError("2026-11-01", "2026-12-02")).toMatch(String(MAX_BOOKING_DAYS));
    expect(bookingLengthError("2026-11-01", "2099-01-01")).not.toBeNull();
  });
  it("expires unanswered requests after REQUEST_EXPIRY_HOURS", () => {
    const now = d("2026-11-03T12:00:00Z");
    expect(requestExpiryCutoff(now).getTime()).toBe(now.getTime() - REQUEST_EXPIRY_HOURS * 3600_000);
  });
  it("lets only confirmed and handed-over bookings hold dates, never a request", () => {
    expect(holdsDatesQuery().$and[0]).toEqual({ status: { $in: ["CONFIRMED", "ACTIVE"] } });
  });
  it("combines with the clash query without overwriting its $or", () => {
    const merged = { ...bookingClashQuery(d("2026-11-01"), d("2026-11-03")), ...holdsDatesQuery() };
    expect(merged.$or).toHaveLength(2);
    expect(merged.$and).toHaveLength(1);
  });
});

describe("personal booking moves", () => {
  it("lets renters cancel only before handover", () => {
    expect(RENTER_MOVES.PENDING).toEqual(["CANCELLED"]);
    expect(RENTER_MOVES.CONFIRMED).toEqual(["CANCELLED"]);
    expect(RENTER_MOVES.ACTIVE).toBeUndefined();
    expect(RENTER_MOVES.COMPLETED).toBeUndefined();
  });
  it("lets owners move forward one step, never back", () => {
    expect(PERSONAL_OWNER_MOVES.PENDING).toContain("CONFIRMED");
    expect(PERSONAL_OWNER_MOVES.PENDING).not.toContain("COMPLETED");
    expect(PERSONAL_OWNER_MOVES.COMPLETED).toBeUndefined();
    expect(PERSONAL_OWNER_MOVES.CANCELLED).toBeUndefined();
  });
});

describe("heldDays", () => {
  it("holds pickup up to, not including, the return day", () => {
    expect(heldDays("2026-11-01", "2026-11-04")).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
  });
  it("holds just the pickup day for a same-day or next-day return", () => {
    expect(heldDays("2026-11-01", "2026-11-01")).toEqual(["2026-11-01"]);
    expect(heldDays("2026-11-01T00:00:00.000Z", "2026-11-02T00:00:00.000Z")).toEqual(["2026-11-01"]);
  });
  it("crosses months", () => {
    expect(heldDays("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("agrees with the clash rule: the return day is free for the next pickup", () => {
    const taken = new Set(heldDays("2026-11-01", "2026-11-04"));
    expect(needsTakenDay("2026-11-04", "2026-11-06", taken)).toBe(false);
    expect(needsTakenDay("2026-10-29", "2026-11-01", taken)).toBe(false);
    expect(needsTakenDay("2026-10-29", "2026-11-02", taken)).toBe(true);
    expect(needsTakenDay("2026-11-03", "2026-11-03", taken)).toBe(true);
  });
});

describe("cancel reasons", () => {
  it("only accepts the reasons AutoGO sets itself", () => {
    expect(cancelReasonOf("DATES_TAKEN")).toBe("DATES_TAKEN");
    expect(cancelReasonOf("EXPIRED")).toBe("EXPIRED");
    expect(cancelReasonOf(undefined)).toBeNull();
    expect(cancelReasonOf("OWNER")).toBeNull();
  });
  it("tells the renter what happened and what to do", () => {
    expect(CANCEL_REASON_TEXT.DATES_TAKEN.text).toMatch(/booked by someone else/);
    expect(CANCEL_REASON_TEXT.EXPIRED.text).toMatch(/48 hours/);
  });
});
