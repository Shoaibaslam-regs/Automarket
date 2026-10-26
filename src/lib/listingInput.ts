// Checks a listing's fields from the Sell form (POST /api/listings) or an owner's edit (PATCH /api/listings/[id]).
// Client-safe and unit-tested. Without it, any text length and any number (negative prices, a year 9999, a
// multi-megabyte description) went straight into the database.

export const LISTING_LIMITS = {
  title: 120,
  description: 5000,
  make: 60,
  model: 60,
  location: 80,
  short: 40, // colour, fuel type, transmission
  maxImages: 20,
  /** PKR 1,000 crore: far above any vehicle, low enough to stop absurd numbers */
  maxPrice: 10_000_000_000,
  minYear: 1950,
  maxMileage: 3_000_000,
  /** Per day, and for a whole booking's deposit */
  maxDailyRate: 10_000_000,
  maxDeposit: 100_000_000,
} as const;

export const LISTING_TYPES = ["SALE", "RENT", "BOTH"] as const;
export const LISTING_CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"] as const;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function text(v: unknown, label: string, max: number, { required = true, min = 1 } = {}): Result<string | undefined> {
  if (v === undefined || v === null || v === "") return required ? fail(`${label} is required`) : { ok: true, value: undefined };
  if (typeof v !== "string") return fail(`${label} must be text`);
  const t = v.trim();
  if (!t) return required ? fail(`${label} is required`) : { ok: true, value: undefined };
  if (t.length < min) return fail(`${label} is too short`);
  if (t.length > max) return fail(`${label} can be at most ${max} characters`);
  return { ok: true, value: t };
}

function num(v: unknown, label: string, min: number, max: number, { required = true, integer = false } = {}): Result<number | undefined> {
  if (v === undefined || v === null || v === "") return required ? fail(`${label} is required`) : { ok: true, value: undefined };
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/,/g, "").trim()) : NaN;
  if (!Number.isFinite(n)) return fail(`${label} must be a number`);
  if (integer && !Number.isInteger(n)) return fail(`${label} must be a whole number`);
  if (n < min || n > max) return fail(`${label} must be between ${min.toLocaleString("en-PK")} and ${max.toLocaleString("en-PK")}`);
  return { ok: true, value: n };
}

/** The latest model year a seller may enter: next year's models are already on sale. */
export const maxModelYear = (now = new Date()) => now.getFullYear() + 1;

export type ListingFields = {
  title?: string; description?: string; price?: number; type?: (typeof LISTING_TYPES)[number];
  condition?: (typeof LISTING_CONDITIONS)[number]; make?: string; model?: string; year?: number; mileage?: number;
  color?: string; fuelType?: string; transmission?: string; location?: string; images?: string[];
};

/**
 * The listing's own fields, checked and cleaned. `partial` (an edit) checks only the fields that were sent;
 * a new listing must have title, description, price, type, condition, make, model, year and location.
 */
export function parseListingFields(body: Record<string, unknown>, { partial = false, now = new Date() } = {}): Result<ListingFields> {
  const out: ListingFields = {};
  const has = (k: string) => !partial || (body && k in body);
  const L = LISTING_LIMITS;
  const steps: [string, () => Result<unknown>][] = [
    ["title", () => text(body.title, "Title", L.title, { min: 3 })],
    ["description", () => text(body.description, "Description", L.description, { min: 10 })],
    ["price", () => num(body.price, "Price", 1, L.maxPrice)],
    ["make", () => text(body.make, "Make", L.make)],
    ["model", () => text(body.model, "Model", L.model)],
    ["year", () => num(body.year, "Year", L.minYear, maxModelYear(now), { integer: true })],
    ["mileage", () => num(body.mileage, "Mileage", 0, L.maxMileage, { required: false })],
    ["color", () => text(body.color, "Colour", L.short, { required: false })],
    ["fuelType", () => text(body.fuelType, "Fuel type", L.short, { required: false })],
    ["transmission", () => text(body.transmission, "Transmission", L.short, { required: false })],
    ["location", () => text(body.location, "City", L.location)],
  ];
  for (const [key, check] of steps) {
    if (!has(key)) continue;
    const r = check();
    if (!r.ok) return r;
    (out as Record<string, unknown>)[key] = r.value;
  }
  if (has("type")) {
    if (!LISTING_TYPES.includes(body.type as never)) return fail("Choose For sale, For rent or Both");
    out.type = body.type as ListingFields["type"];
  }
  if (has("condition")) {
    if (!LISTING_CONDITIONS.includes(body.condition as never)) return fail("Choose the vehicle's condition");
    out.condition = body.condition as ListingFields["condition"];
  }
  if (has("images")) {
    const raw = body.images ?? [];
    if (!Array.isArray(raw) || raw.some(u => typeof u !== "string" || u.length > 500)) return fail("Photos must be uploaded images");
    const unique = [...new Set(raw as string[])];
    if (unique.length > L.maxImages) return fail(`A listing can have at most ${L.maxImages} photos`);
    out.images = unique;
  }
  return { ok: true, value: out };
}

export type RentalFields = { dailyRate: number; weeklyRate?: number; monthlyRate?: number; deposit: number; availableFrom: Date; availableTo?: Date };

/** Rental terms for a RENT or BOTH listing: daily rate required, weekly/monthly optional, deposit 0 or more. */
export function parseRentalFields(body: Record<string, unknown>, now = new Date()): Result<RentalFields> {
  const L = LISTING_LIMITS;
  const daily = num(body.dailyRate, "Daily rate", 1, L.maxDailyRate);
  if (!daily.ok) return daily;
  const weekly = num(body.weeklyRate, "Weekly rate", 1, L.maxDailyRate * 7, { required: false });
  if (!weekly.ok) return weekly;
  const monthly = num(body.monthlyRate, "Monthly rate", 1, L.maxDailyRate * 31, { required: false });
  if (!monthly.ok) return monthly;
  const deposit = num(body.deposit, "Deposit", 0, L.maxDeposit, { required: false });
  if (!deposit.ok) return deposit;
  const from = body.availableFrom ? new Date(String(body.availableFrom)) : now;
  const to = body.availableTo ? new Date(String(body.availableTo)) : undefined;
  if (isNaN(from.getTime()) || (to && isNaN(to.getTime()))) return fail("Choose valid availability dates");
  if (to && to < from) return fail("Available until can't be before available from");
  return { ok: true, value: { dailyRate: daily.value!, weeklyRate: weekly.value, monthlyRate: monthly.value, deposit: deposit.value ?? 0, availableFrom: from, availableTo: to } };
}
