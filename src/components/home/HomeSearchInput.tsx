"use client";

import { useState } from "react";
import SearchSuggest from "@/components/SearchSuggest";

/**
 * The home page search field with suggestions; it stays a normal form field (name="search") so Enter still searches.
 * A sentence ("civic under 70 lac in karachi") is offered as a smart search that opens Browse with those filters;
 * submitting the form with it does the same, since Browse reads a sentence in `search` too.
 */
export default function HomeSearchInput() {
  const [q, setQ] = useState("");
  return (
    <SearchSuggest
      name="search"
      value={q}
      onChange={setQ}
      smart
      placeholder="Try “Civic under 70 lac Karachi”"
      className="min-w-0 flex-1"
      inputClassName="w-full bg-transparent py-2.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
    />
  );
}
