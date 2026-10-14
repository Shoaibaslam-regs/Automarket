"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";

const SORTS = [
  { value: "ending", label: "Ending soon" },
  { value: "newest", label: "Newest" },
  { value: "discount", label: "Biggest discount" },
];

/** Make, city and sort filters for /deals, kept in the URL so filtered pages can be shared. */
export default function DealFilters({ makes, cities }: { makes: string[]; cities: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const value = (k: string) => params.get(k) ?? "";

  function set(key: string, v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(key, v);
    else next.delete(key);
    router.push(`/deals${next.toString() ? `?${next}` : ""}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <div role="group" aria-label="Deal type" className="col-span-2 inline-flex h-10 rounded-xl bg-white p-1 ring-1 ring-inset ring-slate-200 sm:col-span-1">
        {([["", "All"], ["SALE", "For sale"], ["RENT", "For rent"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => set("type", v)} aria-pressed={value("type") === v}
            className={`flex-1 rounded-lg px-3 text-xs font-semibold transition sm:flex-none ${value("type") === v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
            {label}
          </button>
        ))}
      </div>
      <Select value={value("make")} onChange={v => set("make", v)} ariaLabel="Make" className="h-10 sm:w-44"
        options={[{ value: "", label: "All makes" }, ...makes.map(m => ({ value: m, label: m }))]} />
      <Select value={value("city")} onChange={v => set("city", v)} ariaLabel="City" className="h-10 sm:w-44"
        options={[{ value: "", label: "All cities" }, ...cities.map(c => ({ value: c, label: c }))]} />
      <Select value={value("sort") || "ending"} onChange={v => set("sort", v === "ending" ? "" : v)} ariaLabel="Sort" className="col-span-2 h-10 sm:col-span-1 sm:w-48"
        options={SORTS} />
    </div>
  );
}
