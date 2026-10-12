"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Brand = { name: string; logo?: string; svg?: React.ReactNode };

// Logos live in public/brands (cleaned, transparent PNGs). Ordered roughly by popularity in Pakistan;
// bikes without a logo file keep their drawn icon.
const BRANDS: Brand[] = [
  { name: "Toyota", logo: "/brands/toyota.png" },
  { name: "Honda", logo: "/brands/honda.png" },
  { name: "Suzuki", logo: "/brands/suzuki.png" },
  { name: "Hyundai", logo: "/brands/hyundai.png" },
  { name: "Kia", logo: "/brands/kia.png" },
  { name: "Nissan", logo: "/brands/nissan.png" },
  { name: "BYD", logo: "/brands/byd.png" },
  { name: "Mercedes", logo: "/brands/mercedes.png" },
  { name: "BMW", logo: "/brands/bmw.png" },
  { name: "Audi", logo: "/brands/audi.png" },
  { name: "Porsche", logo: "/brands/porsche.png" },
  { name: "Mini", logo: "/brands/mini.png" },
  { name: "Bentley", logo: "/brands/bentley.png" },
  { name: "Ferrari", logo: "/brands/ferrari.png" },
  { name: "Lamborghini", logo: "/brands/lamborghini.png" },
  {
    name: "Yamaha",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <circle cx="50" cy="50" r="42" fill="#1B1B1B"/>
        <text x="50" y="66" textAnchor="middle" fill="#E60026" fontSize="38" fontWeight="bold" fontFamily="Arial">Y</text>
      </svg>
    ),
  },
  {
    name: "Kawasaki",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#00A550"/>
        <text x="50" y="66" textAnchor="middle" fill="white" fontSize="38" fontWeight="bold" fontFamily="Arial">K</text>
      </svg>
    ),
  },
];

/**
 * One horizontally scrolling row of makes. Tiles snap into place, the scrollbar is hidden,
 * and the edges fade to hint that there is more to swipe through. On larger screens,
 * arrow buttons scroll the row for mouse users.
 */
export default function BrandLogos() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  function updateEdges() {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }

  useEffect(() => {
    queueMicrotask(updateEdges);
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, []);

  function scrollBy(dir: 1 | -1) {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow = "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-0 sm:flex";
  const tile =
    "group flex w-[88px] flex-shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border bg-white px-2 py-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.3)] sm:w-[104px] sm:py-4";
  return (
    <div className="relative">
      <button type="button" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Scroll makes left" className={`${arrow} -left-3`}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Scroll makes right" className={`${arrow} -right-3`}>
        <ChevronRight size={18} />
      </button>
      <div
        ref={rowRef}
        onScroll={updateEdges}
        role="list"
        aria-label="Browse by make"
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 py-2 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-40px),transparent)] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
      >
        {BRANDS.map(brand => (
          <Link
            key={brand.name}
            role="listitem"
            href={`/listings?make=${encodeURIComponent(brand.name)}`}
            className={`${tile} border-slate-200/80 hover:border-slate-300`}
          >
            <span className="flex h-11 w-11 items-center justify-center transition group-hover:scale-110 sm:h-12 sm:w-12">
              {brand.logo ? (
                <Image src={brand.logo} alt="" width={48} height={48} className="h-full w-full object-contain" />
              ) : (
                brand.svg
              )}
            </span>
            <span className="max-w-full truncate text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 sm:text-xs">{brand.name}</span>
          </Link>
        ))}
        <Link role="listitem" href="/listings" className={`${tile} justify-center border-dashed border-slate-300 bg-slate-50/60 hover:border-slate-400`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:scale-110 sm:h-12 sm:w-12">
            <ArrowRight size={18} />
          </span>
          <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 sm:text-xs">All makes</span>
        </Link>
      </div>
    </div>
  );
}
