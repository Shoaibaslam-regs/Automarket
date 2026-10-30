"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Search, Sparkles } from "lucide-react";
import type { Suggestion } from "@/lib/suggest";
import { filtersToSearchParams, type ListingFilters } from "@/lib/listingFilters";
import { parseSmartSearch, smartLabels } from "@/lib/smartSearch";

/**
 * A search input that suggests make + model pairs, cities and matching vehicles as you type.
 * Arrow keys move through the list, Enter picks; Enter with nothing highlighted submits the surrounding form
 * as usual. `onPick` handles a choice (the browse page applies it as filters); without it the choice opens its page.
 * With `smart`, a typed sentence ("civic under 70 lac in karachi, automatic") is read into filters
 * (src/lib/smartSearch.ts) and offered as the first row, which Enter picks: `onSmart` applies them, without it
 * Browse opens with them (the surrounding form's `type` radio is kept when the sentence doesn't name one).
 */
export default function SearchSuggest({ value, onChange, onPick, smart = false, onSmart, name, placeholder, className = "", inputClassName = "", ariaLabel = "Search vehicles" }: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (s: Suggestion) => void;
  smart?: boolean;
  onSmart?: (filters: ListingFilters) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const skipNext = useRef(false);

  // The smart row shows once a sentence gives at least two filters ("karachi" alone is already a city suggestion)
  const understood = useMemo(() => {
    if (!smart || value.trim().length < 3) return null;
    const parsed = parseSmartSearch(value);
    const labels = parsed.applied ? smartLabels(parsed.filters) : [];
    return labels.length >= 2 ? { filters: parsed.filters, labels } : null;
  }, [smart, value]);
  const offset = understood ? 1 : 0;
  const total = offset + items.length;

  useEffect(() => {
    const q = value.trim();
    // Picking a suggestion fills the box; don't search again for that text
    if (skipNext.current) { skipNext.current = false; return; }
    if (q.length < 2) { queueMicrotask(() => setItems([])); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => { setItems(d.suggestions ?? []); setActive(-1); })
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  useEffect(() => {
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  function pick(s: Suggestion) {
    setOpen(false);
    setItems([]);
    if (onPick) { skipNext.current = true; onPick(s); }
    else router.push(s.href);
  }

  function pickSmart() {
    if (!understood) return;
    setOpen(false);
    setItems([]);
    if (onSmart) { skipNext.current = true; onSmart(understood.filters); return; }
    const params = filtersToSearchParams(understood.filters);
    const form = input.current?.form;
    const formType = form ? new FormData(form).get("type") : null;
    if (!params.has("type") && typeof formType === "string" && formType) params.set("type", formType);
    router.push(`/listings?${params}`);
  }

  // The smart row is row 0 and is picked by Enter until the arrows move elsewhere (active -1 = "the default")
  const smartActive = !!understood && active <= 0;
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !total) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => ((i < 0 && understood ? 0 : i) + 1) % total); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i <= 0 ? total - 1 : i - 1)); }
    else if (e.key === "Enter" && smartActive) { e.preventDefault(); pickSmart(); }
    else if (e.key === "Enter" && active >= offset) { e.preventDefault(); pick(items[active - offset]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const showList = open && total > 0;
  return (
    <div ref={box} className={`relative ${className}`}>
      <input
        ref={input}
        name={name}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={smartActive ? `${listId}-smart` : active >= 0 ? `${listId}-${active - offset}` : undefined}
        autoComplete="off"
        className={inputClassName}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 text-left shadow-2xl">
          {understood && (
            <li id={`${listId}-smart`} role="option" aria-selected={smartActive}
              onPointerDown={e => { e.preventDefault(); pickSmart(); }} onMouseEnter={() => setActive(0)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${smartActive ? "bg-slate-100" : ""} ${items.length ? "border-b border-slate-100" : ""}`}>
              <span className="flex flex-shrink-0 items-center justify-center text-indigo-500"><Sparkles size={15} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Smart search</span>
                <span className="block text-xs leading-relaxed text-slate-500">{understood.labels.join(" · ")}</span>
              </span>
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Enter</span>
            </li>
          )}
          {items.map((s, i) => {
            const Icon = s.kind === "city" ? MapPin : s.kind === "model" ? Search : Car;
            return (
              <li key={`${s.kind}-${s.href}`} id={`${listId}-${i}`} role="option" aria-selected={i + offset === active}
                onPointerDown={e => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i + offset)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i + offset === active ? "bg-slate-100" : ""}`}>
                <span className="flex flex-shrink-0 items-center justify-center text-slate-500"><Icon size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{s.label}</span>
                  <span className="block truncate text-xs text-slate-500">{s.sub}</span>
                </span>
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.kind === "model" ? "Model" : s.kind === "city" ? "City" : "Vehicle"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
