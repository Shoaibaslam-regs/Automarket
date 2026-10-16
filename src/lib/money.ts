// Client-safe Money categories and helpers (business expenses, profit per vehicle, cash book).

export const MONEY_OUT = [
  { id: "VEHICLE_PURCHASE", label: "Vehicle purchase", vehicle: true },
  { id: "REPAIR", label: "Repair & parts", vehicle: true },
  { id: "DENTING_PAINT", label: "Denting & paint", vehicle: true },
  { id: "FUEL", label: "Fuel", vehicle: true },
  { id: "MAINTENANCE", label: "Service & maintenance", vehicle: true },
  { id: "DRIVER", label: "Driver", vehicle: true },
  { id: "COMMISSION", label: "Commission", vehicle: true },
  { id: "TAX_DOCS", label: "Token tax & documents", vehicle: true },
  { id: "INSURANCE", label: "Insurance", vehicle: true },
  { id: "SALARY", label: "Salaries", vehicle: false },
  { id: "RENT_BILLS", label: "Shop rent & bills", vehicle: false },
  { id: "DEPOSIT_REFUND", label: "Deposit refund", vehicle: false, auto: true },
  { id: "PAYMENT_CORRECTION", label: "Payment correction", vehicle: false, auto: true },
  { id: "OTHER_OUT", label: "Other expense", vehicle: true },
] as const;

export const MONEY_IN = [
  { id: "BOOKING_PAYMENT", label: "Booking payment", auto: true },
  { id: "SALE_PAYMENT", label: "Sale payment", auto: true },
  { id: "INSTALLMENT", label: "Installment", auto: true },
  { id: "OTHER_IN", label: "Other income" },
] as const;

export type MoneyCategory = (typeof MONEY_OUT)[number]["id"] | (typeof MONEY_IN)[number]["id"];

export const MONEY_LABEL: Record<string, string> = Object.fromEntries([...MONEY_OUT, ...MONEY_IN].map(c => [c.id, c.label]));

/** Categories a person can pick when adding an entry by hand (the rest are written automatically). */
export const MANUAL_OUT = MONEY_OUT.filter(c => !("auto" in c && c.auto));
export const MANUAL_IN = MONEY_IN.filter(c => !("auto" in c && c.auto));

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** "2026-10-16" for a moment, in Pakistan time. */
export function pkDay(d: Date | string = new Date()): string {
  return new Date(new Date(d).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start and end (exclusive) of a Pakistan-time day or month given as "YYYY-MM-DD" or "YYYY-MM". */
export function pkRange(key: string): { from: Date; to: Date } {
  const [y, m, d] = key.split("-").map(Number);
  if (d) {
    const from = new Date(Date.UTC(y, m - 1, d) - PKT_OFFSET_MS);
    return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
  }
  return { from: new Date(Date.UTC(y, m - 1, 1) - PKT_OFFSET_MS), to: new Date(Date.UTC(y, m, 1) - PKT_OFFSET_MS) };
}
