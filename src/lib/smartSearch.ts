// Client-safe "smart search": turns a typed sentence into Browse filters, e.g.
// "Find Honda Civic under 70 lac in Karachi, automatic" → make Honda, search "Civic", maxPrice 7,000,000,
// location Karachi, transmission Automatic. Plain rules, no AI call, so it is instant and free.
// Understands lakh/crore/k/million amounts, year ranges, mileage, cities and their short names, common
// Pakistani models (which also give the make) and a few Roman Urdu words (tak, se kam, kiraya, gari).

import { CITIES } from "@/lib/cities";
import { MAKES } from "@/lib/vehicleOptions";
import { formatLakh } from "@/lib/format";
import type { ListingFilters } from "@/lib/listingFilters";

export type SmartSearch = {
  /** Filters found in the text; `search` holds the model or any words left over. */
  filters: ListingFilters;
  /** True when anything besides plain search words was understood. */
  applied: boolean;
};

const isYear = (n: number) => Number.isInteger(n) && n >= 1950 && n <= 2100;

function unitValue(u: string | undefined): number | null {
  if (!u) return null;
  if (/^(lacs?|lakhs?|l)$/.test(u)) return 1e5;
  if (/^(crores?|cr|karore?)$/.test(u)) return 1e7;
  if (/^(million|mn|m)$/.test(u)) return 1e6;
  if (/^(k|thousand|hazaa?r)$/.test(u)) return 1e3;
  return null;
}

/** Rupees from "70" + "lac"; plain numbers count when a currency was written or they are clearly prices. */
function money(n: string, unit: string | undefined, currency: boolean): number | null {
  const v = parseFloat(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  const mult = unitValue(unit);
  if (mult) return Math.round(v * mult);
  if (currency || v >= 10_000) return Math.round(v);
  return null;
}

const N = String.raw`(\d+(?:\.\d+)?)`;
const U = String.raw`(lacs?|lakhs?|crores?|karore?|cr|million|mn|thousand|hazaa?r|k|l|m)?\b`;
const CUR = String.raw`(rs\.?|pkr|rupees?)?\s*`;
const YEAR = String.raw`(19[5-9]\d|20\d\d)`;
const NOT_MONEY = String.raw`(?!\s*(?:lacs?|lakhs?|crores?|cr|k|thousand|million|l|m)\b)`;
const MAX_WORDS = String.raw`(?<![a-z])(?:under|below|less than|lower than|up ?to|within|max(?:imum)?|budget(?: of| is)?|not more than|no more than|<=?)`;
const MIN_WORDS = String.raw`(?<![a-z])(?:over|above|more than|at least|min(?:imum)?|starting(?: from| at)?|>=?)`;

/** Common models people search by name, with the make they belong to. Longer names first. */
const MODELS: [RegExp, string, string][] = [
  [/\bcorolla cross\b/, "Corolla Cross", "Toyota"],
  [/\bland ?cruiser\b/, "Land Cruiser", "Toyota"],
  [/\bcorolla\b/, "Corolla", "Toyota"], [/\byaris\b/, "Yaris", "Toyota"], [/\bcamry\b/, "Camry", "Toyota"],
  [/\bfortuner\b/, "Fortuner", "Toyota"], [/\bhilux\b/, "Hilux", "Toyota"], [/\brevo\b/, "Revo", "Toyota"],
  [/\bprado\b/, "Prado", "Toyota"], [/\baqua\b/, "Aqua", "Toyota"], [/\bprius\b/, "Prius", "Toyota"],
  [/\bvitz\b/, "Vitz", "Toyota"], [/\bpasso\b/, "Passo", "Toyota"], [/\braize\b/, "Raize", "Toyota"],
  [/\bhiace\b/, "Hiace", "Toyota"],
  [/\bcivic\b/, "Civic", "Honda"], [/\bhonda city\b/, "City", "Honda"], [/\baccord\b/, "Accord", "Honda"],
  [/\bbr-?v\b/, "BR-V", "Honda"], [/\bhr-?v\b/, "HR-V", "Honda"], [/\bvezel\b/, "Vezel", "Honda"],
  [/\bn[- ]?wgn\b/, "N-WGN", "Honda"], [/\bn[- ]?box\b/, "N-Box", "Honda"],
  [/\bcd ?70\b/, "CD 70", "Honda"], [/\bcg ?125\b/, "CG 125", "Honda"],
  [/\bwagon ?r\b/, "Wagon R", "Suzuki"], [/\balto\b/, "Alto", "Suzuki"], [/\bcultus\b/, "Cultus", "Suzuki"],
  [/\bmehran\b/, "Mehran", "Suzuki"], [/\bswift\b/, "Swift", "Suzuki"], [/\bbolan\b/, "Bolan", "Suzuki"],
  [/\bjimny\b/, "Jimny", "Suzuki"], [/\bsuzuki every\b/, "Every", "Suzuki"], [/\bsuzuki ravi\b/, "Ravi", "Suzuki"],
  [/\belantra\b/, "Elantra", "Hyundai"], [/\btucson\b/, "Tucson", "Hyundai"], [/\bsonata\b/, "Sonata", "Hyundai"],
  [/\bsanta ?fe\b/, "Santa Fe", "Hyundai"], [/\bporter\b/, "Porter", "Hyundai"],
  [/\bsportage\b/, "Sportage", "Kia"], [/\bpicanto\b/, "Picanto", "Kia"], [/\bstonic\b/, "Stonic", "Kia"],
  [/\bsorento\b/, "Sorento", "Kia"], [/\bcarnival\b/, "Carnival", "Kia"],
  [/\balsvin\b/, "Alsvin", "Changan"], [/\boshan\b/, "Oshan", "Changan"],
  [/\bsunny\b/, "Sunny", "Nissan"], [/\bdayz\b/, "Dayz", "Nissan"],
  [/\batto ?3\b/, "Atto 3", "BYD"], [/\bbyd seal\b/, "Seal", "BYD"], [/\bbyd shark\b/, "Shark", "BYD"],
  [/\bybr\b/, "YBR", "Yamaha"],
];

/** Other ways people write a make. */
const MAKE_ALIASES: [RegExp, string][] = [
  [/\b(mercedes[- ]?benz|benz|merc)\b/, "Mercedes"],
];

/** Short names for cities. */
const CITY_ALIASES: [RegExp, string][] = [
  [/\b(khi)\b/, "Karachi"], [/\b(lhr)\b/, "Lahore"], [/\b(isb|isl|isloo)\b/, "Islamabad"],
  [/\b(pindi|rwp)\b/, "Rawalpindi"], [/\b(fsd|lyallpur)\b/, "Faisalabad"], [/\b(pesh)\b/, "Peshawar"],
  [/\b(hyd)\b/, "Hyderabad"],
];

const STOPWORDS = new Set(
  ("find show me i im i'm want wanna need needed looking look search searching get give buy purchase for a an the in " +
   "at on with and or of to from my any some please pls plz car cars vehicle vehicles gari gaari gaadi garri bike bikes " +
   "motorcycle motorbike transmission gear gearbox model models price priced budget range rs pkr rupee rupees " +
   "condition used second hand cheap good best available near city around about km kms lac lacs lakh lakhs crore " +
   "crores under below above over max min than less more mein me ki ka ke chahiye chahye wali wala sale rent " +
   "pe par se ko hai ho koi acha achi achha family suv sedan hatchback awd 4x4 4wd luxury urgent")
    .split(" ")
);

/** Reads a typed sentence into Browse filters. `applied` is false for plain searches ("white", "abc"). */
export function parseSmartSearch(input: string): SmartSearch {
  const f: ListingFilters = {};
  let t = ` ${input.toLowerCase().slice(0, 200).replace(/(\d),(?=\d)/g, "$1").replace(/[“”"!?]/g, " ").replace(/\s+/g, " ")} `;

  /** Removes every match the handler accepts (returns true), leaving the rest of the text for later rules. */
  const take = (re: RegExp, fn: (g: (string | undefined)[]) => boolean) => {
    t = t.replace(re, (match: string, ...rest: unknown[]) => (fn(rest.slice(0, -2) as (string | undefined)[]) ? " " : match));
  };
  const setMax = (v: number | null) => (v && !f.maxPrice ? ((f.maxPrice = v), true) : false);
  const setMin = (v: number | null) => (v && !f.minPrice ? ((f.minPrice = v), true) : false);

  // Daily rates mean a rental: "under 8000 per day", "5k/day"
  take(new RegExp(String.raw`(?:(${MAX_WORDS})\s*|(${MIN_WORDS})\s*)?${CUR}${N}\s*${U}\s*(?:per day|/ ?day|a day|daily|per din|rozana)\b`, "g"), ([, minW, , n, u]) => {
    const v = money(n!, u, true);
    if (!v) return false;
    f.type = "RENT";
    return minW ? setMin(v) : setMax(v);
  });

  // Mileage before prices, so "under 50k km" isn't read as PKR 50,000
  take(new RegExp(String.raw`(?:(?:${MAX_WORDS})\s*)?${N}\s*(k|thousand)?\s*(?:km|kms|kilometers?|kilometres?)\b(?:\s*(?:driven|done|mileage))?`, "g"), ([n, k]) => {
    const v = Math.round(parseFloat(n!) * (k ? 1000 : 1));
    if (!(v > 0)) return false;
    f.maxMileage = v;
    return true;
  });

  // Ranges: "50-70 lac", "between 50 lakh and 1 crore", "2015 to 2020"
  take(new RegExp(String.raw`(?:between |from )?${CUR}${N}\s*${U}\s*(?:-|to|and|se)\s*${CUR}${N}\s*${U}`, "g"), ([c1, n1, u1, c2, n2, u2]) => {
    const a = parseFloat(n1!), b = parseFloat(n2!);
    if (!u1 && !u2 && !c1 && !c2 && isYear(a) && isYear(b)) {
      f.minYear = Math.min(a, b);
      f.maxYear = Math.max(a, b);
      return true;
    }
    // "2020 and 70 lac" is a year and a budget, not a range
    if ((!u1 && isYear(a)) || (!u2 && isYear(b))) return false;
    const lo = money(n1!, u1 ?? u2, !!(c1 || c2)), hi = money(n2!, u2 ?? u1, !!(c1 || c2));
    if (!lo || !hi) return false;
    f.minPrice = Math.min(lo, hi);
    f.maxPrice = Math.max(lo, hi);
    return true;
  });

  // Years with words around them: "after 2015", "2018+", "2018 or newer", "before 2010"
  take(new RegExp(String.raw`\b(?:after|since|newer than|later than|from|above|over)\s*${YEAR}\b${NOT_MONEY}`, "g"), ([y]) => ((f.minYear = Number(y)), true));
  take(new RegExp(String.raw`\b${YEAR}\s*(?:\+|and above|and newer|or newer|onwards?|or later|se upar)`, "g"), ([y]) => ((f.minYear = Number(y)), true));
  take(new RegExp(String.raw`\b(?:before|older than|till|until|below|under)\s*${YEAR}\b${NOT_MONEY}`, "g"), ([y]) => ((f.maxYear = Number(y)), true));

  // Prices with words around them: "under 70 lac", "above 1 crore", "around 30 lakh", "70 lac tak"
  take(new RegExp(String.raw`(?:${MAX_WORDS})\s*${CUR}${N}\s*${U}`, "g"), ([cur, n, u]) => setMax(money(n!, u, !!cur)));
  take(new RegExp(String.raw`(?:${MIN_WORDS})\s*${CUR}${N}\s*${U}`, "g"), ([cur, n, u]) => setMin(money(n!, u, !!cur)));
  take(new RegExp(String.raw`(?:around|about|approx(?:imately)?|near|lagbhag)\s*${CUR}${N}\s*${U}`, "g"), ([cur, n, u]) => {
    const v = money(n!, u, !!cur);
    if (!v || f.minPrice || f.maxPrice) return false;
    f.minPrice = Math.round(v * 0.85);
    f.maxPrice = Math.round(v * 1.15);
    return true;
  });
  take(new RegExp(String.raw`${CUR}${N}\s*${U}\s*(?:tak|tk|max|or less|or below|se kam)\b`, "g"), ([cur, n, u]) => setMax(money(n!, u, !!cur)));
  take(new RegExp(String.raw`${CUR}${N}\s*${U}\s*(?:se zyada|se ziada|or more|or above|plus)\b`, "g"), ([cur, n, u]) => setMin(money(n!, u, !!cur)));

  // A single model year: "civic 2020", "2018 model"
  if (!f.minYear && !f.maxYear) {
    take(new RegExp(String.raw`(?:\bmodel\s*)?\b${YEAR}\b${NOT_MONEY}(?:\s*model\b)?`), ([y]) => {
      f.minYear = f.maxYear = Number(y);
      return true;
    });
  }

  // A lone amount is a budget: "civic 70 lac", "rs 4500000"
  take(new RegExp(String.raw`${CUR}${N}\s*(lacs?|lakhs?|crores?|karore?|cr|million|mn)\b`, "g"), ([, n, u]) => setMax(money(n!, u, true)));
  take(new RegExp(String.raw`(rs\.?|pkr|rupees?)\s*${N}\s*${U}`, "g"), ([cur, n, u]) => setMax(money(n!, u, !!cur)));

  // Words: listing type, condition, fuel, transmission
  const word = (re: RegExp, fn: () => void) => take(re, () => (fn(), true));
  word(/\b(for rent|on rent|rental|rent a car|hire|kiraye?|kiraya)\b/g, () => (f.type = "RENT"));
  if (!f.type) word(/\b(for sale|to buy)\b/g, () => (f.type = "SALE"));
  if (!f.type && /\brent\b/.test(t)) f.type = "RENT";
  word(/\b(brand new|new)\b/g, () => (f.condition = "NEW"));
  word(/\b(excellent|mint) condition\b/g, () => (f.condition = "EXCELLENT"));
  word(/\b(automatic|auto|tiptronic|a\/t)\b/g, () => (f.transmission = "Automatic"));
  word(/\b(manual|stick|m\/t)\b/g, () => (f.transmission = "Manual"));
  word(/\b(petrol|gasoline)\b/g, () => (f.fuelType = "Petrol"));
  word(/\b(diesel)\b/g, () => (f.fuelType = "Diesel"));
  word(/\b(cng)\b/g, () => (f.fuelType = "CNG"));
  word(/\b(hybrid)\b/g, () => (f.fuelType = "Hybrid"));
  word(/\b(electric|ev)\b/g, () => (f.fuelType = "Electric"));

  // Models give their make; a make written out wins over the model's
  let model: string | null = null;
  for (const [re, name, make] of MODELS) {
    if (re.test(t)) {
      model = name;
      f.make = make;
      t = t.replace(re, " ");
      break;
    }
  }
  for (const [re, make] of MAKE_ALIASES) if (re.test(t)) { f.make = make; t = t.replace(re, " "); }
  for (const make of MAKES) {
    if (make === "Other") continue;
    const re = new RegExp(`\\b${make.toLowerCase()}\\b`);
    if (re.test(t)) { f.make = make; t = t.replace(re, " "); break; }
  }

  // Cities, longest first so nothing shorter matches inside a longer name
  for (const city of [...CITIES].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${city.toLowerCase()}\\b`);
    if (re.test(t)) { f.location = city; t = t.replace(re, " "); break; }
  }
  if (!f.location) for (const [re, city] of CITY_ALIASES) if (re.test(t)) { f.location = city; t = t.replace(re, " "); break; }

  const applied = Object.keys(f).length > 0;
  // What is left becomes the text search: the model when one was named, else (after a make) up to two words,
  // which are probably a model this list doesn't know ("honda n-one"). Without a make, leftovers are dropped,
  // since words like "family" or "white" would hide every listing that doesn't repeat them in its title.
  const rest = t.replace(/[^a-z0-9\- ]/g, " ").split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w) && !/^\d+(\.\d+)?$/.test(w));
  if (model) f.search = model;
  else if (f.make && rest.length && rest.length <= 2) f.search = rest.join(" ");
  if (!applied) return { filters: { search: input.trim() || undefined }, applied: false };
  return { filters: f, applied };
}

const TYPE_LABEL: Record<string, string> = { SALE: "For sale", RENT: "For rent", BOTH: "Sale & rent" };

/** Short labels for what was understood, in reading order: "Honda", "Civic", "Up to PKR 70 lakh", "Karachi"… */
export function smartLabels(f: ListingFilters): string[] {
  const rupees = (n: number) => (f.type === "RENT" ? `PKR ${n.toLocaleString("en-PK")}/day` : `PKR ${formatLakh(n)}`);
  const price = f.minPrice && f.maxPrice ? `${rupees(f.minPrice)} – ${rupees(f.maxPrice).replace(/^PKR /, "")}`
    : f.maxPrice ? `Up to ${rupees(f.maxPrice)}` : f.minPrice ? `From ${rupees(f.minPrice)}` : null;
  const year = f.minYear && f.maxYear ? (f.minYear === f.maxYear ? `${f.minYear} model` : `${f.minYear}–${f.maxYear}`)
    : f.minYear ? `${f.minYear} or newer` : f.maxYear ? `${f.maxYear} or older` : null;
  return [
    f.make,
    f.search && f.search !== f.make ? (f.search.includes(" ") && !/^[A-Z]/.test(f.search) ? `“${f.search}”` : f.search) : null,
    f.type && TYPE_LABEL[f.type],
    f.condition === "NEW" ? "New" : f.condition === "EXCELLENT" ? "Excellent condition" : null,
    price,
    year,
    f.maxMileage && `Under ${f.maxMileage.toLocaleString("en-PK")} km`,
    f.location,
    f.transmission,
    f.fuelType,
  ].filter((v): v is string => !!v);
}
