"use client";

import { Fragment, useState, useEffect, useMemo, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, SlidersHorizontal, X, MapPin, ArrowUpDown, Bell, BellRing, LayoutGrid, List, ChevronDown, Loader2, Sparkles } from "lucide-react";
import ListingCard from "@/components/listings/ListingCard";
import Select from "@/components/ui/Select";
import { IListing } from "@/models/Listing";
import { formatLakh } from "@/lib/format";
import {
  CONDITIONS, FUEL_TYPES, TRANSMISSIONS, filtersToSearchParams, hasFilters, parseFilters, type ListingFilters,
} from "@/lib/listingFilters";
import { useRateLock } from "@/hooks/useRateLock";
import RecentlyViewed from "@/components/listings/RecentlyViewed";
import SearchSuggest from "@/components/SearchSuggest";
import { parseSmartSearch, smartLabels } from "@/lib/smartSearch";
import { CITIES, MY_CITY_KEY } from "@/lib/cities";
import { MAKES as ALL_MAKES } from "@/lib/vehicleOptions";
import { SponsoredCard } from "@/components/home/SponsoredRow";
import { SPONSORED_AD } from "@/lib/plans";
import type { SponsoredItem } from "@/lib/sponsored";

// The shared makes list, without the Sell form's "Other"
const MAKES = ALL_MAKES.filter(m => m !== "Other");
const TYPES = [
  ["", "All"],
  ["SALE", "For Sale"],
  ["RENT", "For Rent"],
  ["BOTH", "Sale & Rent"],
] as const;
const SORTS = [
  ["createdAt", "Newest first"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["year_desc", "Model year: newest"],
  ["mileage_asc", "Mileage: lowest"],
] as const;
const PAGE_SIZE = 12;
/** Opening a link with ?page=N reloads at most this many pages, so a long scroll can be resumed without a huge request */
const MAX_RESUME_PAGES = 8;
/** The grid/list choice made on a phone, kept per browser */
const VIEW_KEY = "browse-view";
const PHONE_QUERY = "(max-width: 639px)";

const MAKE_OPTIONS = [{ value: "", label: "All makes" }, ...MAKES.map(m => ({ value: m, label: m }))];
const SORT_OPTIONS = SORTS.map(([value, label]) => ({ value, label }));

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Any" },
  ...Array.from({ length: THIS_YEAR - 1979 }, (_, i) => String(THIS_YEAR - i)).map(y => ({ value: y, label: y })),
];
// Quick price picks as [label, min, max] in PKR ("" = no limit): lakh and crore for sale, per day for rent
const SALE_PRICE_PICKS = [
  ["Under 10 lakh", "", "1000000"],
  ["10–25 lakh", "1000000", "2500000"],
  ["25–50 lakh", "2500000", "5000000"],
  ["50 lakh–1 crore", "5000000", "10000000"],
  ["Over 1 crore", "10000000", ""],
] as const;
const RENT_PRICE_PICKS = [
  ["Under 5,000", "", "5000"],
  ["5,000–10,000", "5000", "10000"],
  ["10,000–20,000", "10000", "20000"],
  ["Over 20,000", "20000", ""],
] as const;
const CITY_OPTIONS = [{ value: "", label: "All Pakistan" }, ...CITIES.map(c => ({ value: c, label: c }))];

/**
 * A price box typed in lakh ("26" or "2.5") that holds rupees for the filter. It keeps the typed text, so a
 * half-typed "2." isn't rewritten, and follows outside changes (quick picks, Clear all).
 */
function LakhInput({ value, onChange, placeholder }: { value: string; onChange: (pkr: string) => void; placeholder: string }) {
  const toText = (v: string) => (v ? String(Number(v) / 1e5) : "");
  const [text, setText] = useState(() => toText(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(toText(value));
  }
  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={e => {
          const t = e.target.value.replace(/[^\d.]/g, "");
          const n = parseFloat(t);
          const pkr = t && !Number.isNaN(n) ? String(Math.round(n * 1e5)) : "";
          setText(t);
          setShown(pkr);
          onChange(pkr);
        }}
        className={`${fieldClass} pr-11`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">lakh</span>
    </div>
  );
}

const MILEAGE_OPTIONS = [
  { value: "", label: "Any mileage" },
  ...[10000, 25000, 50000, 75000, 100000, 150000].map(km => ({ value: String(km), label: `Up to ${km.toLocaleString("en-PK")} km` })),
];

type ListingWithId = IListing & { _id: string };

function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</p>;
}

export default function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const initialParams = use(searchParams);
  // Every filter can come from the URL, so searches can be shared, bookmarked and saved. A sentence in `search`
  // (the home page's smart search, a shared link) is read into filters first.
  const fromUrl = parseFilters(initialParams);
  const smartStart = fromUrl.search ? parseSmartSearch(fromUrl.search) : null;
  const initial: ListingFilters = smartStart?.applied ? { ...fromUrl, ...smartStart.filters, search: smartStart.filters.search } : fromUrl;
  const str = (v: string | number | undefined) => (v === undefined ? "" : String(v));
  const initialSort = typeof initialParams.sort === "string" && SORTS.some(([v]) => v === initialParams.sort) ? initialParams.sort : "createdAt";
  // How many pages were loaded when this link was made (scrolling adds pages), so Back returns to the same spot
  const initialPage = Math.min(MAX_RESUME_PAGES, Math.max(1, Number(initialParams.page) || 1));
  const router = useRouter();
  const { status: authStatus } = useSession();

  const [listings, setListings] = useState<ListingWithId[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  // The number of pages loaded so far: scrolling near the end loads the next one, any filter change resets it to 1
  const [page, setPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(str(initial.search));
  const [type, setType] = useState<string>(str(initial.type));
  const [make, setMake] = useState(str(initial.make));
  const [condition, setCondition] = useState(str(initial.condition));
  const [minPrice, setMinPrice] = useState(str(initial.minPrice));
  const [maxPrice, setMaxPrice] = useState(str(initial.maxPrice));
  const [location, setLocation] = useState(str(initial.location));
  const [minYear, setMinYear] = useState(str(initial.minYear));
  const [maxYear, setMaxYear] = useState(str(initial.maxYear));
  const [maxMileage, setMaxMileage] = useState(str(initial.maxMileage));
  const [fuelType, setFuelType] = useState(str(initial.fuelType));
  const [transmission, setTransmission] = useState(str(initial.transmission));
  const [sort, setSort] = useState<string>(initialSort);
  // Sold and rented vehicles are shown (tagged) unless the visitor hides them
  const [availableOnly, setAvailableOnly] = useState(initialParams.available === "1");
  // Phones open in the list view (photo beside details), or the view the visitor last picked on a phone;
  // tablets and desktops always open in the grid. Switching across the phone width (rotating, resizing)
  // re-applies the rule. Applied after mount so the server HTML stays the grid. Until then (`viewKnown` false)
  // the loading placeholders follow the screen width in CSS (list on phones, grid from sm), so a slow phone
  // doesn't see grid placeholders swapped for list ones once the code arrives (a layout shift).
  const [view, setView] = useState<"grid" | "list">("grid");
  const [viewKnown, setViewKnown] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia(PHONE_QUERY);
    const apply = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(VIEW_KEY); } catch {}
      setView(phone.matches ? (saved === "grid" ? "grid" : "list") : "grid");
      setViewKnown(true);
    };
    queueMicrotask(apply);
    phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);
  function chooseView(v: "grid" | "list") {
    setView(v);
    // Only a phone choice is remembered, so it never carries over to a bigger screen
    if (window.matchMedia(PHONE_QUERY).matches) {
      try { localStorage.setItem(VIEW_KEY, v); } catch {}
    }
  }
  const saveLock = useRateLock("savedSearches");
  const [saveState, setSaveState] = useState<{ query: string; status: "saving" | "saved" | "error"; message?: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [closingFilters, setClosingFilters] = useState(false);

  // Let the sheet play its exit animation before unmounting
  function closeFilters() {
    setClosingFilters(true);
    setTimeout(() => {
      setShowFilters(false);
      setClosingFilters(false);
    }, 220);
  }

  // The visitor's city: applied when Browse opens without a location in the address, changed with the city picker
  useEffect(() => {
    if (initial.location) return;
    let saved = "";
    try { saved = localStorage.getItem(MY_CITY_KEY) ?? ""; } catch {}
    if (saved) queueMicrotask(() => setLocation(saved));
    // Only on open: later changes come from the visitor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function chooseCity(city: string) {
    setLocation(city);
    setPage(1);
    try { localStorage.setItem(MY_CITY_KEY, city); } catch {}
  }
  // A location typed in the filters that isn't one of the listed cities still shows in the picker
  const cityOptions = location && !CITY_OPTIONS.some(o => o.value === location)
    ? [...CITY_OPTIONS, { value: location, label: location }]
    : CITY_OPTIONS;
  const cityPicker = (
    <div className="flex items-center gap-1 text-slate-500">
      <MapPin size={14} strokeWidth={2} className="flex-shrink-0" />
      <Select
        value={location}
        onChange={chooseCity}
        options={cityOptions}
        ariaLabel="City"
        size="sm"
        className="w-auto max-w-[150px] gap-1 border-0 bg-transparent px-1 text-[13px] font-semibold text-slate-700 hover:text-slate-900"
      />
    </div>
  );

  // Free-text inputs update instantly in the UI but only trigger a fetch once typing pauses
  const debouncedSearch = useDebounce(search);
  const debouncedMinPrice = useDebounce(minPrice);
  const debouncedMaxPrice = useDebounce(maxPrice);
  const debouncedLocation = useDebounce(location);

  // Smart search: while the box holds a sentence ("civic under 70 lac in karachi"), the results already use what
  // it says; Enter or the suggestion's Smart search row then turns it into ordinary filters (commitSmart)
  const smartLive = useMemo(() => parseSmartSearch(debouncedSearch), [debouncedSearch]);
  const smartPreview = smartLive.applied ? smartLive.filters : null;

  // parseFilters drops empty/invalid values, so this is exactly what the API will apply
  const filters: ListingFilters = parseFilters({
    search: debouncedSearch, type, make, condition, minPrice: debouncedMinPrice, maxPrice: debouncedMaxPrice,
    location: debouncedLocation, minYear, maxYear, maxMileage, fuelType, transmission,
    ...(smartPreview && { ...smartPreview, search: smartPreview.search ?? "" }),
  });
  const filterQuery = filtersToSearchParams(filters).toString();
  const params = filtersToSearchParams(filters);
  if (sort !== "createdAt") params.set("sort", sort);
  if (availableOnly) params.set("available", "1");
  // The query without a page: changing it starts the list again from the top
  params.set("limit", String(PAGE_SIZE));
  const query = params.toString();
  params.delete("limit");
  if (page > 1) params.set("page", String(page));
  // The view depends on the screen, so it isn't put in the address bar (a shared link opens right on any device)
  const urlQuery = params.toString();

  // Mirror the current search in the address bar without a navigation
  useEffect(() => {
    const next = urlQuery ? `/listings?${urlQuery}` : "/listings";
    if (window.location.pathname + window.location.search !== next) window.history.replaceState(null, "", next);
  }, [urlQuery]);

  const saveStatus = saveState?.query === filterQuery ? saveState : null;

  async function saveSearch() {
    if (authStatus !== "authenticated") {
      router.push("/login");
      return;
    }
    setSaveState({ query: filterQuery, status: "saving" });
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json();
      saveLock.check(res, data);
      if (!res.ok) throw new Error(data.error || "Couldn't save this search");
      setSaveState({ query: filterQuery, status: "saved" });
    } catch (err) {
      setSaveState({ query: filterQuery, status: "error", message: err instanceof Error ? err.message : "Couldn't save this search" });
    }
  }

  // Loading is derived: true until the response for the current query has arrived
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  // The query whose pages are on screen, so a "load more" answer that arrives after a filter change is dropped
  const currentQuery = useRef(query);
  // Only the first load resumes a longer scroll (?page=N in the link); every later query starts at page 1
  const resumePages = useRef(initialPage);

  useEffect(() => {
    const controller = new AbortController();
    currentQuery.current = query;
    const pages = resumePages.current;
    resumePages.current = 1;
    const getPage = (n: number) =>
      fetch(`/api/listings?${query}&page=${n}`, { signal: controller.signal }).then(r => r.json());

    Promise.all(Array.from({ length: pages }, (_, i) => getPage(i + 1)))
      .then(results => {
        const last = results[results.length - 1];
        setListings(results.flatMap(d => d.listings || []));
        setPagination(last.pagination || { page: 1, pages: 1, total: 0 });
        setPage(Math.min(pages, Math.max(1, last.pagination?.pages ?? 1)));
        setLoadedQuery(query);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        console.error(err);
        setLoadedQuery(query);
      });

    return () => controller.abort();
  }, [query]);

  const hasMore = !loading && page < pagination.pages;

  // Sponsored ads matching what the visitor is looking at (their city first, the make and sale/rent filters), shown
  // between the results: after the 4th vehicle, then after every SPONSORED_AD.browseEvery, each ad at most once
  const adCity = filters.location ?? "";
  const adMake = filters.make ?? "";
  const adType = filters.type === "SALE" || filters.type === "RENT" ? filters.type : "";
  const adQuery = `city=${encodeURIComponent(adCity)}&make=${encodeURIComponent(adMake)}&type=${adType}&limit=8`;
  const [sponsored, setSponsored] = useState<SponsoredItem[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sponsored?${adQuery}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setSponsored(d?.items ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [adQuery]);
  /** The sponsored ad shown after result `i`, if any */
  const adAfter = (i: number) => (i % SPONSORED_AD.browseEvery === 3 ? sponsored[Math.floor(i / SPONSORED_AD.browseEvery)] : undefined);

  /** Adds the next page below the vehicles already shown. */
  function loadMore() {
    if (loadingMore || !hasMore) return;
    const forQuery = query;
    const next = page + 1;
    setLoadingMore(true);
    fetch(`/api/listings?${forQuery}&page=${next}`)
      .then(r => r.json())
      .then(d => {
        if (currentQuery.current !== forQuery) return;
        setListings(prev => {
          // A listing published meanwhile shifts the pages by one; skip any card already shown
          const seen = new Set(prev.map(l => String(l._id)));
          return [...prev, ...(d.listings || []).filter((l: ListingWithId) => !seen.has(String(l._id)))];
        });
        if (d.pagination) setPagination(d.pagination);
        setPage(next);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingMore(false));
  }

  // Load the next page automatically when the end of the list comes within about two screens
  const moreRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; });
  useEffect(() => {
    const el = moreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) loadMoreRef.current();
    }, { rootMargin: "0px 0px 1200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, page]);

  // Lock page scroll behind the mobile filter sheet
  useEffect(() => {
    if (!showFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters]);

  // Phones and tablets: once the hero search has scrolled away, a compact search bar slides in whenever the
  // visitor scrolls up, and tucks away again while they scroll down through the results
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barShown, setBarShown] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const hero = heroSearchRef.current;
        const typing = !!barRef.current?.contains(document.activeElement);
        if (!hero || hero.getBoundingClientRect().bottom > 56) setBarShown(false);
        else if (y < lastY - 6) setBarShown(true);
        else if (y > lastY + 6 && !typing) setBarShown(false);
        if (Math.abs(y - lastY) > 6) lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /** Turns smart-search filters into the page's own filters (shown as removable chips); false when there are none. */
  function applySmart(found: ListingFilters) {
    const setters: Partial<Record<keyof ListingFilters, (v: string) => void>> = {
      type: setType, make: setMake, condition: setCondition, location: setLocation, fuelType: setFuelType,
      transmission: setTransmission, minPrice: setMinPrice, maxPrice: setMaxPrice, minYear: setMinYear,
      maxYear: setMaxYear, maxMileage: setMaxMileage,
    };
    for (const [key, set] of Object.entries(setters) as [keyof ListingFilters, (v: string) => void][]) {
      const v = found[key];
      if (v !== undefined) set(String(v));
    }
    setSearch(found.search ?? "");
    setPage(1);
  }
  function commitSmart(text: string) {
    const parsed = parseSmartSearch(text);
    if (parsed.applied) applySmart(parsed.filters);
  }

  /** Brings the top of the results back into view after a change made from the compact bar. */
  function jumpToResults() {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setSearch("");
    setType("");
    setMake("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setMinYear("");
    setMaxYear("");
    setMaxMileage("");
    setFuelType("");
    setTransmission("");
    setSort("createdAt");
    setPage(1);
  }

  const activeChips = [
    type && { label: TYPES.find(([v]) => v === type)?.[1] ?? type, clear: () => setType("") },
    make && { label: make, clear: () => setMake("") },
    condition && { label: condition.toLowerCase(), clear: () => setCondition("") },
    minPrice && { label: `Min PKR ${formatLakh(Number(minPrice))}`, clear: () => setMinPrice("") },
    maxPrice && { label: `Max PKR ${formatLakh(Number(maxPrice))}`, clear: () => setMaxPrice("") },
    location && { label: location, clear: () => setLocation("") },
    minYear && { label: `From ${minYear}`, clear: () => setMinYear("") },
    maxYear && { label: `Up to ${maxYear}`, clear: () => setMaxYear("") },
    maxMileage && { label: `≤ ${Number(maxMileage).toLocaleString("en-PK")} km`, clear: () => setMaxMileage("") },
    fuelType && { label: fuelType, clear: () => setFuelType("") },
    transmission && { label: transmission, clear: () => setTransmission("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const activeFilterCount = activeChips.length;
  // Empty results: the search and each filter as a one-tap removal, the city worded as "Search all Pakistan"
  const emptyFixes = [
    search && { label: `"${search}"`, clear: () => setSearch("") },
    ...activeChips.map(c => (location && c.label === location ? { label: "Search all Pakistan", clear: c.clear } : c)),
    availableOnly && { label: "Hide sold & rented", clear: () => setAvailableOnly(false) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  // Plain JSX (not an inner component) so inputs aren't remounted and don't lose focus on each keystroke
  const filterPanel = (
    <div className="bl-stagger flex flex-col gap-6">
      <div>
        <FilterLabel>Listing type</FilterLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {TYPES.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setType(val);
                setPage(1);
              }}
              className={`bl-press rounded-lg px-3 py-2 text-[13px] font-medium ${
                type === val
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>Make</FilterLabel>
        <Select
          value={make}
          onChange={v => {
            setMake(v);
            setPage(1);
          }}
          options={MAKE_OPTIONS}
          ariaLabel="Make"
        />
      </div>

      <div>
        <FilterLabel>Condition</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCondition(condition === c ? "" : c);
                setPage(1);
              }}
              className={`bl-press rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                condition === c
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-400"
              }`}
            >
              {c.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>{type === "RENT" ? "Rent per day (PKR)" : "Price"}</FilterLabel>
        {/* Quick picks; pressing the chosen one again clears it */}
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {(type === "RENT" ? RENT_PRICE_PICKS : SALE_PRICE_PICKS).map(([label, min, max]) => {
            const on = minPrice === min && maxPrice === max;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setMinPrice(on ? "" : min);
                  setMaxPrice(on ? "" : max);
                  setPage(1);
                }}
                className={`bl-press rounded-full px-3 py-1.5 text-xs font-medium ${
                  on ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* Sale prices are typed in lakh (26 = 26 lakh); rent per day in rupees */}
        {type !== "RENT" ? (
          <div className="flex items-center gap-2">
            <LakhInput value={minPrice} onChange={v => { setMinPrice(v); setPage(1); }} placeholder="Min" />
            <span className="text-slate-300">–</span>
            <LakhInput value={maxPrice} onChange={v => { setMaxPrice(v); setPage(1); }} placeholder="Max" />
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={e => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className={`${fieldClass} min-w-0`}
          />
          <span className="text-slate-300">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={e => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className={`${fieldClass} min-w-0`}
          />
        </div>
        )}
        {(Number(minPrice) >= 1e5 || Number(maxPrice) >= 1e5) && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            {minPrice ? formatLakh(Number(minPrice)) : "Any"} – {maxPrice ? formatLakh(Number(maxPrice)) : "Any"}
          </p>
        )}
      </div>

      <div>
        <FilterLabel>Model year</FilterLabel>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select value={minYear} onChange={v => { setMinYear(v); setPage(1); }} options={YEAR_OPTIONS} ariaLabel="Minimum model year" />
          </div>
          <span className="text-slate-300">–</span>
          <div className="min-w-0 flex-1">
            <Select value={maxYear} onChange={v => { setMaxYear(v); setPage(1); }} options={YEAR_OPTIONS} ariaLabel="Maximum model year" />
          </div>
        </div>
      </div>

      <div>
        <FilterLabel>Mileage</FilterLabel>
        <Select value={maxMileage} onChange={v => { setMaxMileage(v); setPage(1); }} options={MILEAGE_OPTIONS} ariaLabel="Maximum mileage" />
      </div>

      <div>
        <FilterLabel>Fuel type</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {FUEL_TYPES.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => { setFuelType(fuelType === f ? "" : f); setPage(1); }}
              className={`bl-press rounded-full px-3 py-1.5 text-xs font-medium ${
                fuelType === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>Transmission</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {TRANSMISSIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTransmission(transmission === t ? "" : t); setPage(1); }}
              className={`bl-press rounded-full px-3 py-1.5 text-xs font-medium ${
                transmission === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-slate-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>Location</FilterLabel>
        <div className="relative">
          <MapPin size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="City or area"
            value={location}
            onChange={e => {
              setLocation(e.target.value);
              setPage(1);
            }}
            className={`${fieldClass} pl-9`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Plain header on the page background: title beside the search on desktop, type tabs underneath
          (the home page keeps the dark hero) */}
      <section className="relative z-20">
        <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 sm:pt-9">
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div className="flex items-start justify-between gap-3">
            <div>
              {/* The marketplace's brand gradient (indigo → fuchsia, as on avatars and menu dots) */}
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Marketplace</h1>
              <p className="mt-1 text-sm text-slate-500">Browse cars and bikes for sale and rent across Pakistan.</p>
            </div>
            {/* Phones and tablets: the city beside the title; desktop has it at the end of the tabs */}
            <div className="mt-1 flex-shrink-0 lg:hidden">{cityPicker}</div>
            </div>

          <div ref={heroSearchRef} className="relative mt-4 w-full lg:mt-0 lg:max-w-md">
            <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
            <SearchSuggest
              placeholder="Try “Civic under 70 lac in Karachi”"
              smart
              onSmart={applySmart}
              value={search}
              onChange={v => {
                setSearch(v);
                setPage(1);
              }}
              // A suggestion becomes filters here (make + model, or a city); a vehicle opens its page
              onPick={sg => {
                setPage(1);
                if (sg.kind === "model") { setMake(sg.make); setSearch(sg.search); }
                else if (sg.kind === "city") { setLocation(sg.location); setSearch(""); }
                else router.push(sg.href);
              }}
              inputClassName="w-full rounded-xl border-0 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
          </div>

          {/* Quick type switch: underline tabs, then the city on desktop */}
          <div className="-mx-4 mt-4 flex items-end border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TYPES.map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setType(val);
                  setPage(1);
                }}
                className={`-mb-px flex-shrink-0 border-b-2 pb-2.5 text-sm font-medium transition ${
                  type === val
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-1.5 hidden flex-shrink-0 lg:block">{cityPicker}</div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-4 sm:px-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          {/* Desktop sidebar */}
          <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:block">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <SlidersHorizontal size={15} strokeWidth={2} />
                Filters
              </p>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters} className="bl-pop text-xs font-medium text-rose-600 hover:text-rose-700">
                  Clear all
                </button>
              )}
            </div>
            {filterPanel}
          </aside>

          {/* Results (scroll-mt clears the navbar and the compact bar) */}
          <div ref={resultsRef} className="min-w-0 scroll-mt-[150px] lg:scroll-mt-24">
            <RecentlyViewed compact className="mb-4 sm:mb-5" />
            {/* Phones: two tight rows with no card ([count … Hide sold], then [Filters | sort | view]);
                wider screens: one row in a card */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:mb-5 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:px-4 sm:py-2.5 sm:shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex min-w-0 items-center gap-3">
                <p className="text-sm text-slate-500">
                  <span className="font-bold text-slate-900">{pagination.total.toLocaleString()}</span> vehicle
                  {pagination.total !== 1 ? "s" : ""} found
                </p>
                {hasFilters(filters) && (
                  <button
                    type="button"
                    onClick={saveSearch}
                    disabled={saveStatus?.status === "saving" || saveStatus?.status === "saved" || saveLock.locked}
                    title="Get an email when new vehicles match this search"
                    className={`bl-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      saveStatus?.status === "saved"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        : "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100"
                    }`}
                  >
                    {saveStatus?.status === "saved" ? <BellRing size={13} strokeWidth={2.2} /> : <Bell size={13} strokeWidth={2.2} />}
                    {saveLock.locked ? saveLock.text : saveStatus?.status === "saving" ? "Saving…" : saveStatus?.status === "saved" ? "Alert on" : "Save search"}
                  </button>
                )}
              </div>

              {/* On phones this label sits beside the count as plain text; wider screens give it a box in the row */}
              <label className="inline-flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 sm:hidden">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={e => { setAvailableOnly(e.target.checked); setPage(1); }}
                  className="h-3.5 w-3.5 accent-slate-900"
                />
                Hide sold
              </label>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                <label className="hidden h-10 cursor-pointer whitespace-nowrap select-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm sm:inline-flex">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={e => { setAvailableOnly(e.target.checked); setPage(1); }}
                    className="h-4 w-4 accent-slate-900"
                  />
                  Hide sold &amp; rented
                </label>
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm lg:hidden"
                >
                  <SlidersHorizontal size={15} strokeWidth={2} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span key={activeFilterCount} className="bl-pop rounded-full bg-slate-900 px-1.5 py-px text-[11px] font-bold text-white">{activeFilterCount}</span>
                  )}
                </button>

                <div className="order-last flex h-10 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:order-none">
                  {(["grid", "list"] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => chooseView(v)}
                      aria-label={v === "grid" ? "Grid view" : "List view"}
                      aria-pressed={view === v}
                      className={`flex w-10 items-center justify-center transition ${view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      {v === "grid" ? <LayoutGrid size={15} strokeWidth={1.75} /> : <List size={15} strokeWidth={1.75} />}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-1 basis-0 items-center gap-2 sm:flex-none sm:basis-auto">
                  <ArrowUpDown size={14} strokeWidth={2} className="hidden flex-shrink-0 text-slate-400 sm:block" />
                  <div className="min-w-0 flex-1 sm:w-[190px] sm:flex-none">
                    <Select
                      value={sort}
                      onChange={v => {
                        setSort(v);
                        setPage(1);
                      }}
                      options={SORT_OPTIONS}
                      ariaLabel="Sort listings"
                      className="shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {saveStatus?.status === "error" && (
              <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                {saveStatus.message}
              </p>
            )}
            {saveStatus?.status === "saved" && (
              <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200">
                Search saved. We&apos;ll email you when new vehicles match it. Manage alerts in{" "}
                <Link href="/saved" className="font-semibold underline">Saved</Link>.
              </p>
            )}

            {/* What a typed sentence was read as, until Enter turns it into the chips below */}
            {smartPreview && (
              <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500" role="status">
                <Sparkles size={14} className="mt-px flex-shrink-0 text-indigo-500" />
                <span>
                  <span className="font-semibold text-slate-700">Smart search:</span> {smartLabels(smartPreview).join(" · ")}
                  <button type="button" onClick={() => commitSmart(debouncedSearch)} className="ml-2 font-semibold text-indigo-600 hover:underline">
                    Keep as filters
                  </button>
                </span>
              </p>
            )}

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeChips.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      chip.clear();
                      setPage(1);
                    }}
                    className="bl-pop inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-2 text-xs font-medium capitalize text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:ring-slate-400"
                  >
                    {chip.label}
                    <X size={12} strokeWidth={2.5} className="text-slate-400" />
                  </button>
                ))}
                <button type="button" onClick={clearFilters} className="px-1 text-xs font-medium text-rose-600 hover:underline">
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              <>
              {(view === "list" || !viewKnown) && (
              <div className={`flex flex-col gap-3 sm:gap-4 ${viewKnown ? "" : "sm:hidden"}`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/80 sm:gap-5 sm:rounded-[22px] sm:p-2">
                    <div className="aspect-[4/3] w-[42%] flex-shrink-0 animate-pulse rounded-xl bg-slate-200/70 sm:w-[260px] sm:rounded-2xl md:w-[300px] lg:w-[320px]" />
                    <div className="flex-1 space-y-3 py-2 pr-2">
                      <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/70" />
                    </div>
                  </div>
                ))}
              </div>
              )}
              {(view === "grid" || !viewKnown) && (
              <div className={`${viewKnown ? "grid" : "hidden sm:grid"} grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5 md:grid-cols-3`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/80 sm:rounded-[22px] sm:p-2">
                    <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200/70 sm:rounded-2xl" />
                    <div className="space-y-2.5 px-1.5 pb-1.5 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/70" />
                    </div>
                  </div>
                ))}
              </div>
              )}
              </>
            ) : listings.length === 0 ? (
              // Says which filters to drop (one tap each) instead of only "Clear filters"
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex items-center justify-center text-slate-400">
                  <Search size={24} strokeWidth={1.75} />
                </div>
                {emptyFixes.length > 0 ? (
                  <>
                    <p className="text-base font-semibold text-slate-900">No vehicles match all of these</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Try removing one of them:</p>
                    <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2">
                      {emptyFixes.map(fix => (
                        <button
                          key={fix.label}
                          type="button"
                          onClick={() => { fix.clear(); setPage(1); }}
                          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
                        >
                          <X size={14} className="text-slate-400" /> {fix.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={clearFilters} className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-slate-900">{availableOnly ? "No available vehicles right now" : "No vehicles listed yet"}</p>
                    <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                      {availableOnly ? "Show sold and rented ones too, or check back soon." : "Be the first to list one. It's free to start."}
                    </p>
                    {availableOnly ? (
                      <button type="button" onClick={() => { setAvailableOnly(false); setPage(1); }} className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Show sold &amp; rented
                      </button>
                    ) : (
                      <Link href="/sell" className="mt-5 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Sell a vehicle
                      </Link>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div
                key={`${loadedQuery}-${view}`}
                className={view === "list" ? "flex flex-col gap-3 sm:gap-4" : "grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5 md:grid-cols-3"}
              >
                {listings.map((listing, i) => {
                  const ad = adAfter(i);
                  return (
                    <Fragment key={listing._id}>
                      {/* Each newly added page staggers in from its own first card */}
                      <div className="bl-enter h-full" style={{ "--bl-delay": `${Math.min(i % PAGE_SIZE, 8) * 40}ms` } as React.CSSProperties}>
                        <ListingCard listing={listing} layout={view} eager={i < (view === "list" ? 1 : 3)} />
                      </div>
                      {ad && <div className="h-full"><SponsoredCard item={ad} layout={view} /></div>}
                    </Fragment>
                  );
                })}
              </div>
            )}

            {/* More results: loaded automatically near the end (moreRef), with a button as a fallback */}
            {!loading && listings.length > 0 && (
              <div ref={moreRef} className="mt-8 flex flex-col items-center gap-2 text-center">
                {loadingMore ? (
                  <p className="flex items-center gap-2 py-2.5 text-sm text-slate-500" role="status">
                    <Loader2 size={16} className="animate-spin" /> Loading more vehicles…
                  </p>
                ) : hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
                  >
                    Show more vehicles <ChevronDown size={15} />
                  </button>
                ) : null}
                <p className="text-xs text-slate-400">
                  {hasMore || loadingMore
                    ? `Showing ${listings.length.toLocaleString()} of ${pagination.total.toLocaleString()}`
                    : pagination.total > PAGE_SIZE
                      ? `You've seen all ${pagination.total.toLocaleString()} vehicles`
                      : null}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {/* Compact search bar for phones and tablets, shown on scroll up once the hero search is out of view */}
      <div
        ref={barRef}
        inert={!barShown}
        className={`fixed inset-x-0 top-[57px] z-[90] border-b border-slate-200/80 bg-white/95 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-md transition-transform duration-300 ease-out lg:hidden ${
          barShown ? "translate-y-0" : "-translate-y-[calc(100%+60px)]"
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 pt-2.5 sm:px-6">
          <div className="relative min-w-0 flex-1">
            <Search size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              enterKeyHint="search"
              aria-label="Search vehicles"
              placeholder={pagination.total ? `Search ${pagination.total.toLocaleString()} vehicles` : "Search make, model, city"}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  commitSmart(search);
                  jumpToResults();
                }
              }}
              className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-9 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-indigo-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            aria-label={activeFilterCount ? `Filters (${activeFilterCount} on)` : "Filters"}
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 pb-2.5 pt-2 sm:px-6">
          <div className="-ml-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pl-4 pr-1 [scrollbar-width:none] sm:-ml-6 sm:pl-6 [&::-webkit-scrollbar]:hidden">
            {TYPES.map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={type === val}
                onClick={() => {
                  setType(val);
                  setPage(1);
                  jumpToResults();
                }}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  type === val ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={availableOnly}
              onClick={() => {
                setAvailableOnly(v => !v);
                setPage(1);
                jumpToResults();
              }}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                availableOnly ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200"
              }`}
            >
              Hide sold
            </button>
          </div>
          <div className="flex h-8 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {(["grid", "list"] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => chooseView(v)}
                aria-label={v === "grid" ? "Grid view" : "List view"}
                aria-pressed={view === v}
                className={`flex w-8 items-center justify-center transition ${view === v ? "bg-slate-900 text-white" : "text-slate-500"}`}
              >
                {v === "grid" ? <LayoutGrid size={14} strokeWidth={1.75} /> : <List size={14} strokeWidth={1.75} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[150] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="bl-backdrop absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" data-closing={closingFilters} onClick={closeFilters} />
          <div data-closing={closingFilters} className="bl-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[380px] sm:rounded-none">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="text-base font-bold text-slate-900">Filters</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={closeFilters}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{filterPanel}</div>
            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={closeFilters}
                className="flex-[2] rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white"
              >
                {loading ? "Updating…" : `Show ${pagination.total.toLocaleString()} result${pagination.total !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
