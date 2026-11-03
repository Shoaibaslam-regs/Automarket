import { fuelDate } from "@/lib/fuelPrices";

/**
 * "Updated 3 Nov 2026" beside the Fuel prices headings (the fuel page and the blog strip): the day the latest
 * prices were checked by the team. Prices change at most once a day, so it states the day instead of claiming
 * "live". `dark` is for the slate-950 hero.
 */
export default function UpdatedTag({ at, dark = false }: { at?: string | null; dark?: boolean }) {
  if (!at) return null;
  return <span className={`text-xs font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>Updated {fuelDate(at)}</span>;
}
