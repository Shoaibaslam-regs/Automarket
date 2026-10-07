import { formatLakh } from "@/lib/format";

export const LISTING_TYPES = ["SALE", "RENT", "BOTH"] as const;
export const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"] as const;
export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"] as const;
export const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic"] as const;

/** Every browse filter. Shared by the listings API, the browse page URL and saved-search alerts. */
export type ListingFilters = {
  search?: string;
  type?: (typeof LISTING_TYPES)[number];
  make?: string;
  condition?: (typeof CONDITIONS)[number];
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  fuelType?: string;
  transmission?: string;
};

const TEXT_KEYS = ["search", "make", "location", "fuelType", "transmission"] as const;
const NUMBER_KEYS = ["minPrice", "maxPrice", "minYear", "maxYear", "maxMileage"] as const;
export const FILTER_KEYS = [...TEXT_KEYS, "type", "condition", ...NUMBER_KEYS] as const;

type ParamSource = URLSearchParams | Record<string, unknown>;

function read(src: ParamSource, key: string): string | undefined {
  const raw = src instanceof URLSearchParams ? src.get(key) : src[key];
  // Saved searches store numbers as numbers, query strings carry them as text
  const v = typeof raw === "number" ? String(raw) : raw;
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;
}

/** Reads filters from a query string or plain object, dropping anything invalid. */
export function parseFilters(src: ParamSource): ListingFilters {
  const f: ListingFilters = {};
  for (const k of TEXT_KEYS) {
    const v = read(src, k);
    if (v) f[k] = v;
  }
  const type = read(src, "type");
  if (type && (LISTING_TYPES as readonly string[]).includes(type)) f.type = type as ListingFilters["type"];
  const condition = read(src, "condition");
  if (condition && (CONDITIONS as readonly string[]).includes(condition)) f.condition = condition as ListingFilters["condition"];
  for (const k of NUMBER_KEYS) {
    const n = Number(read(src, k));
    if (Number.isFinite(n) && n > 0) f[k] = n;
  }
  return f;
}

export function filtersToSearchParams(f: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = f[k];
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  return params;
}

export function hasFilters(f: ListingFilters): boolean {
  return FILTER_KEYS.some(k => f[k] !== undefined);
}

// Escape user input so characters like "(" or "+" don't throw on RegExp construction
const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (v: string) => new RegExp(escape(v), "i");
const exact = (v: string) => new RegExp(`^${escape(v)}$`, "i");

/** MongoDB query for ACTIVE listings matching the filters. */
export function buildListingQuery(f: ListingFilters): Record<string, unknown> {
  const q: Record<string, unknown> = { status: "ACTIVE" };
  if (f.type) q.type = f.type;
  if (f.condition) q.condition = f.condition;
  if (f.make) q.make = contains(f.make);
  if (f.location) q.location = contains(f.location);
  if (f.fuelType) q.fuelType = exact(f.fuelType);
  if (f.transmission) q.transmission = exact(f.transmission);
  if (f.minPrice || f.maxPrice) q.price = { ...(f.minPrice && { $gte: f.minPrice }), ...(f.maxPrice && { $lte: f.maxPrice }) };
  if (f.minYear || f.maxYear) q.year = { ...(f.minYear && { $gte: f.minYear }), ...(f.maxYear && { $lte: f.maxYear }) };
  if (f.maxMileage) q.mileage = { $lte: f.maxMileage };
  if (f.search) {
    const rx = contains(f.search);
    q.$or = [{ title: rx }, { make: rx }, { model: rx }, { location: rx }];
  }
  return q;
}

type MatchableListing = {
  title: string; make: string; model: string; location: string; type: string; condition: string;
  price: number; year: number; mileage?: number; fuelType?: string; transmission?: string;
};

/** In-memory twin of buildListingQuery, used to check a new listing against saved searches. */
export function listingMatches(l: MatchableListing, f: ListingFilters): boolean {
  const has = (field: string | undefined, v: string) => !!field && contains(v).test(field);
  const is = (field: string | undefined, v: string) => !!field && exact(v).test(field);
  if (f.type && l.type !== f.type) return false;
  if (f.condition && l.condition !== f.condition) return false;
  if (f.make && !has(l.make, f.make)) return false;
  if (f.location && !has(l.location, f.location)) return false;
  if (f.fuelType && !is(l.fuelType, f.fuelType)) return false;
  if (f.transmission && !is(l.transmission, f.transmission)) return false;
  if (f.minPrice && l.price < f.minPrice) return false;
  if (f.maxPrice && l.price > f.maxPrice) return false;
  if (f.minYear && l.year < f.minYear) return false;
  if (f.maxYear && l.year > f.maxYear) return false;
  if (f.maxMileage && (l.mileage == null || l.mileage > f.maxMileage)) return false;
  if (f.search && ![l.title, l.make, l.model, l.location].some(v => has(v, f.search!))) return false;
  return true;
}

const TYPE_LABELS: Record<string, string> = { SALE: "For sale", RENT: "For rent", BOTH: "Sale & rent" };

/** Short human label, e.g. "Honda · Lahore · PKR 20 lakh – 45 lakh · 2015+". */
export function describeFilters(f: ListingFilters): string {
  const range = (lo?: number, hi?: number, fmt: (n: number) => string = String) =>
    lo && hi ? `${fmt(lo)} – ${fmt(hi)}` : lo ? `${fmt(lo)}+` : hi ? `up to ${fmt(hi)}` : "";
  const parts = [
    f.search && `"${f.search}"`,
    f.make,
    f.type && TYPE_LABELS[f.type],
    f.condition && f.condition.charAt(0) + f.condition.slice(1).toLowerCase(),
    f.location,
    (f.minPrice || f.maxPrice) && `PKR ${range(f.minPrice, f.maxPrice, formatLakh)}`,
    range(f.minYear, f.maxYear),
    f.maxMileage && `≤ ${f.maxMileage.toLocaleString("en-PK")} km`,
    f.fuelType,
    f.transmission,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All vehicles";
}
