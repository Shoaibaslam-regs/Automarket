"use client";

import { useEffect, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import { MAX_COMPARE, useCompare, type CompareItem } from "@/hooks/useCompare";

/** Adds/removes a listing from the compare tray. "overlay" sits on a card photo; "pill" is for the listing page. */
export default function CompareButton({ item, variant = "overlay" }: { item: CompareItem; variant?: "overlay" | "pill" }) {
  const selected = useCompare(s => s.items.some(i => i.id === item.id));
  const toggle = useCompare(s => s.toggle);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => setFull(false), 2200);
    return () => clearTimeout(t);
  }, [full]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (toggle(item) === "full") setFull(true);
  }

  const label = full ? `You can compare up to ${MAX_COMPARE}` : selected ? "Remove from compare" : "Add to compare";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          selected ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <GitCompareArrows size={16} strokeWidth={2} />
        {full ? `Max ${MAX_COMPARE}` : selected ? "Comparing" : "Compare"}
      </button>
    );
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur transition hover:scale-105 active:scale-95 ${
          selected ? "bg-indigo-600 text-white" : "bg-white/90 text-slate-700 hover:bg-white"
        }`}
      >
        <GitCompareArrows size={15} strokeWidth={2} />
      </button>
      {full && (
        // Outer span centres, inner one animates: both use transform, so they can't share an element
        <span role="status" className="absolute right-full top-1/2 mr-2 -translate-y-1/2">
          <span className="bl-pop block whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
            Max {MAX_COMPARE} vehicles
          </span>
        </span>
      )}
    </span>
  );
}
