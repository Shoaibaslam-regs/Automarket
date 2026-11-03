// Client-safe: the Deals page's city filter. Every city is offered (with how many live deals it has), and a city
// with none falls back to its region (src/lib/provinces.ts) first, then the rest of Pakistan.
import { CITIES } from "@/lib/cities";
import { FEDERAL_CAPITAL, PROVINCES } from "@/lib/provinces";

const key = (c: string) => c.trim().toLowerCase();

/** A city's region for "nearby": its province, with Islamabad counted with Punjab (it sits beside Rawalpindi). */
export function dealRegion(city: string): { id: string; name: string; cities: string[] } | null {
  const k = key(city);
  if (!k) return null;
  const punjab = PROVINCES.find(p => p.id === "punjab")!;
  if (k === key(FEDERAL_CAPITAL)) return { id: punjab.id, name: `${punjab.name} & ${FEDERAL_CAPITAL}`, cities: [FEDERAL_CAPITAL, punjab.capital, ...punjab.cities] };
  const p = PROVINCES.find(p => [p.capital, ...p.cities].some(c => key(c) === k));
  if (!p) return null;
  const cities = [p.capital, ...p.cities, ...(p.id === "punjab" ? [FEDERAL_CAPITAL] : [])];
  return { id: p.id, name: p.id === "punjab" ? `${p.name} & ${FEDERAL_CAPITAL}` : p.name, cities };
}

/** True when a deal's city is in the same region as `near` (never the city itself, which has no deals). */
export function isNearby(dealCity: string, near: string): boolean {
  const region = dealRegion(near);
  return !!region && key(dealCity) !== key(near) && region.cities.some(c => key(c) === key(dealCity));
}

/** Deals ordered for a city with none of its own: its region's first, then everywhere else, each keeping its order. */
export function nearbyFirst<T extends { location: string }>(deals: T[], near: string): T[] {
  const close = deals.filter(d => isNearby(d.location, near));
  return [...close, ...deals.filter(d => !isNearby(d.location, near))];
}

/** Live deals per city, keyed by the city's name as the picker shows it. */
export function countByCity(locations: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of locations) {
    const name = CITIES.find(c => key(c) === key(l)) ?? l.trim();
    if (name) out.set(name, (out.get(name) ?? 0) + 1);
  }
  return out;
}

/**
 * The city picker: the Browse picker's cities (so Lahore or Hyderabad can always be picked) plus any other city with
 * live deals, cities with deals first. Labels carry the count ("Karachi (4)"); a city without deals is just its name.
 */
export function dealCityOptions(counts: Map<string, number>, current = ""): { value: string; label: string }[] {
  const names = [...new Set<string>([...CITIES, ...counts.keys(), ...(current ? [current] : [])])];
  const n = (c: string) => counts.get(c) ?? 0;
  names.sort((a, b) => (n(b) > 0 ? 1 : 0) - (n(a) > 0 ? 1 : 0));
  return names.map(c => ({ value: c, label: n(c) ? `${c} (${n(c)})` : c }));
}

const KNOWN = [...new Set<string>([...CITIES, FEDERAL_CAPITAL, ...PROVINCES.flatMap(p => [p.capital, ...p.cities])])];

/** A `near` city from the address, only when it is a city AutoGO knows (anything else is ignored). */
export function knownCity(value: string | null | undefined): string {
  return KNOWN.find(c => key(c) === key(value ?? "")) ?? "";
}
