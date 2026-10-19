"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Search } from "lucide-react";
import type { Suggestion } from "@/lib/suggest";

/**
 * A search input that suggests make + model pairs, cities and matching vehicles as you type.
 * Arrow keys move through the list, Enter picks; Enter with nothing highlighted submits the surrounding form
 * as usual. `onPick` handles a choice (the browse page applies it as filters); without it the choice opens its page.
 */
export default function SearchSuggest({ value, onChange, onPick, name, placeholder, className = "", inputClassName = "", ariaLabel = "Search vehicles" }: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (s: Suggestion) => void;
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
  const skipNext = useRef(false);

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

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const showList = open && items.length > 0;
  return (
    <div ref={box} className={`relative ${className}`}>
      <input
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
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={inputClassName}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 text-left shadow-2xl">
          {items.map((s, i) => {
            const Icon = s.kind === "city" ? MapPin : s.kind === "model" ? Search : Car;
            return (
              <li key={`${s.kind}-${s.href}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onPointerDown={e => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? "bg-slate-100" : ""}`}>
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon size={15} /></span>
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
