"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_COMPARE } from "@/lib/compare";

export { MAX_COMPARE };

export type CompareItem = { id: string; title: string; image?: string; price: number; type: string };

type CompareState = {
  items: CompareItem[];
  toggle: (item: CompareItem) => "added" | "removed" | "full";
  remove: (id: string) => void;
  clear: () => void;
};

/**
 * Listings picked for side-by-side comparison, kept in localStorage across pages and visits.
 * skipHydration: CompareBar rehydrates after mount, so the server and first client render match.
 */
export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: item => {
        const { items } = get();
        if (items.some(i => i.id === item.id)) {
          set({ items: items.filter(i => i.id !== item.id) });
          return "removed";
        }
        if (items.length >= MAX_COMPARE) return "full";
        set({ items: [...items, item] });
        return "added";
      },
      remove: id => set({ items: get().items.filter(i => i.id !== id) }),
      clear: () => set({ items: [] }),
    }),
    { name: "automarket-compare", skipHydration: true, partialize: s => ({ items: s.items }) }
  )
);
