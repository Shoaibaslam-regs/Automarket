"use client";

import { useState, useEffect, use } from "react";
import { Search, SlidersHorizontal, X, MapPin, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import ListingCard from "@/components/listings/ListingCard";
import Select from "@/components/ui/Select";
import { IListing } from "@/models/Listing";

const MAKES = ["Toyota", "Honda", "Suzuki", "Yamaha", "Kawasaki", "BMW", "Mercedes", "Hyundai", "Kia", "Ford"];
const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"];
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
] as const;
const PAGE_SIZE = 12;

const MAKE_OPTIONS = [{ value: "", label: "All makes" }, ...MAKES.map(m => ({ value: m, label: m }))];
const SORT_OPTIONS = SORTS.map(([value, label]) => ({ value, label }));

type ListingWithId = IListing & { _id: string };

function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

// Page numbers to show, with "…" gaps: 1 … 4 5 [6] 7 8 … 20
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const pages: (number | "…")[] = [1];
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
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
  const initial = use(searchParams);
  const initialType = typeof initial.type === "string" && ["SALE", "RENT", "BOTH"].includes(initial.type) ? initial.type : "";
  const initialSearch = typeof initial.search === "string" ? initial.search : "";
  const initialMake = typeof initial.make === "string" ? initial.make : "";
  const initialLocation = typeof initial.location === "string" ? initial.location : "";

  const [listings, setListings] = useState<ListingWithId[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState<string>(initialType);
  const [make, setMake] = useState(initialMake);
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [sort, setSort] = useState("createdAt");
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

  // Free-text inputs update instantly in the UI but only trigger a fetch once typing pauses
  const debouncedSearch = useDebounce(search);
  const debouncedMinPrice = useDebounce(minPrice);
  const debouncedMaxPrice = useDebounce(maxPrice);
  const debouncedLocation = useDebounce(location);

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", String(PAGE_SIZE));
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (type) params.set("type", type);
  if (make) params.set("make", make);
  if (condition) params.set("condition", condition);
  if (debouncedMinPrice) params.set("minPrice", debouncedMinPrice);
  if (debouncedMaxPrice) params.set("maxPrice", debouncedMaxPrice);
  if (debouncedLocation) params.set("location", debouncedLocation);
  if (sort) params.set("sort", sort);
  const query = params.toString();

  // Loading is derived: true until the response for the current query has arrived
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const loading = loadedQuery !== query;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/listings?${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        setListings(d.listings || []);
        setPagination(d.pagination || { page: 1, pages: 1, total: 0 });
        setLoadedQuery(query);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        console.error(err);
        setLoadedQuery(query);
      });

    return () => controller.abort();
  }, [query]);

  // Lock page scroll behind the mobile filter sheet
  useEffect(() => {
    if (!showFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters]);

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setSearch("");
    setType("");
    setMake("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setSort("createdAt");
    setPage(1);
  }

  const activeChips = [
    type && { label: TYPES.find(([v]) => v === type)?.[1] ?? type, clear: () => setType("") },
    make && { label: make, clear: () => setMake("") },
    condition && { label: condition.toLowerCase(), clear: () => setCondition("") },
    minPrice && { label: `Min PKR ${Number(minPrice).toLocaleString()}`, clear: () => setMinPrice("") },
    maxPrice && { label: `Max PKR ${Number(maxPrice).toLocaleString()}`, clear: () => setMaxPrice("") },
    location && { label: location, clear: () => setLocation("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const activeFilterCount = activeChips.length;

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
        <FilterLabel>Price (PKR)</FilterLabel>
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
      {/* Hero + search */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.18),transparent_50%)]" />
        <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Marketplace</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Find your next ride</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
            Browse verified cars and bikes for sale and rent across Pakistan.
          </p>

          <div className="relative mt-6 max-w-2xl">
            <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by make, model, location..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-11 text-[15px] text-slate-900 shadow-xl shadow-black/20 outline-none ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400"
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

          {/* Quick type switch */}
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TYPES.map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setType(val);
                  setPage(1);
                }}
                className={`bl-press flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium ${
                  type === val
                    ? "bg-white text-slate-900"
                    : "bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15 hover:bg-white/15"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
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

          {/* Results */}
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">{pagination.total.toLocaleString()}</span> vehicle
                {pagination.total !== 1 ? "s" : ""} found
              </p>

              <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-sm lg:hidden"
                >
                  <SlidersHorizontal size={15} strokeWidth={2} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span key={activeFilterCount} className="bl-pop rounded-full bg-slate-900 px-1.5 py-px text-[11px] font-bold text-white">{activeFilterCount}</span>
                  )}
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
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
              <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 sm:gap-5 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-[22px] bg-white p-2 ring-1 ring-slate-200/80">
                    <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200/70" />
                    <div className="space-y-2.5 px-2 pb-2 pt-4">
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-3.5 w-4/5 animate-pulse rounded bg-slate-200/70" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search size={24} strokeWidth={1.75} />
                </div>
                <p className="text-base font-semibold text-slate-900">No listings found</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  Try adjusting your filters or searching for something else.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div key={loadedQuery} className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 sm:gap-5 md:grid-cols-3">
                {listings.map((listing, i) => (
                  <div key={listing._id} className="bl-enter h-full" style={{ "--bl-delay": `${Math.min(i, 8) * 40}ms` } as React.CSSProperties}>
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageWindow(page, pagination.pages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-sm text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={`h-9 min-w-9 rounded-xl px-2 text-sm font-medium transition ${
                        p === page
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => goToPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  aria-label="Next page"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
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
