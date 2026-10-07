"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, GitCompareArrows, X } from "lucide-react";
import { MAX_COMPARE, useCompare } from "@/hooks/useCompare";

/** Floating tray listing the vehicles picked for comparison, shown on every main page. */
export default function CompareBar() {
  const items = useCompare(s => s.items);
  const remove = useCompare(s => s.remove);
  const clear = useCompare(s => s.clear);
  const pathname = usePathname();

  // Load the saved selection from localStorage after mount (the store skips automatic hydration)
  useEffect(() => {
    useCompare.persist.rehydrate();
  }, []);

  if (items.length === 0 || pathname === "/compare" || pathname === "/") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4">
      <div className="bl-pop pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-2.5 pl-3 text-white shadow-2xl shadow-black/30 backdrop-blur">
        <GitCompareArrows size={18} className="hidden flex-shrink-0 text-indigo-300 sm:block" />
        <div className="flex min-w-0 flex-1 gap-2">
          {Array.from({ length: MAX_COMPARE }).map((_, i) => {
            const item = items[i];
            return item ? (
              <div key={item.id} className="group relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800 ring-1 ring-white/15" title={item.title}>
                {item.image ? (
                  <Image src={item.image} alt={item.title} fill sizes="56px" className="object-cover" />
                ) : (
                  <Car size={16} className="absolute inset-0 m-auto text-slate-500" />
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.title} from compare`}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <div key={`empty-${i}`} className="h-11 w-14 flex-shrink-0 rounded-lg border border-dashed border-white/20" />
            );
          })}
        </div>
        <button type="button" onClick={clear} className="hidden px-1 text-xs font-medium text-slate-400 transition hover:text-white sm:block">
          Clear
        </button>
        {items.length >= 2 ? (
          <Link
            href={`/compare?ids=${items.map(i => i.id).join(",")}`}
            className="flex-shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Compare {items.length}
          </Link>
        ) : (
          <span className="flex-shrink-0 px-2 text-xs text-slate-400">Add 1 more</span>
        )}
      </div>
    </div>
  );
}
