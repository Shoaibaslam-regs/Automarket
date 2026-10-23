"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

// Logos live in public/brands (cleaned, transparent 256px PNGs), ordered roughly by popularity in Pakistan.
// Each name must also be in MAKES (src/lib/vehicleOptions.ts), or sellers can't pick it and its link finds nothing.
const BRANDS = [
  "Toyota", "Honda", "Suzuki", "Hyundai", "Kia", "Changan", "Nissan", "BYD", "Jetour", "Jaecoo", "Tesla",
  "Lexus", "Mercedes", "BMW", "Audi", "Porsche", "Mini", "Jaguar", "Bentley", "Ferrari", "Lamborghini",
];

/**
 * Two rows before "More": 7 logos on phones (4 columns), 11 on tablets (6) and 15 on desktops (8), each row
 * completed by the More tile. Hidden logos are only hidden with CSS, so the server HTML is the same everywhere.
 */
const collapsedClass = (i: number) => (i < 7 ? "flex" : i < 11 ? "hidden sm:flex" : i < 15 ? "hidden lg:flex" : "hidden");

/** Browse by make: a grid of logos with the name under each (no tiles, no scrolling) and More / Show less. */
export default function BrandLogos() {
  const [open, setOpen] = useState(false);
  const cell = "group flex-col items-center gap-1.5 rounded-xl py-2.5 transition hover:bg-slate-100";
  return (
    <div role="list" aria-label="Browse by make" className="grid grid-cols-4 gap-x-2 gap-y-1 sm:grid-cols-6 sm:gap-x-3 lg:grid-cols-8">
      {BRANDS.map((name, i) => (
        <Link
          key={name}
          role="listitem"
          href={`/listings?make=${encodeURIComponent(name)}`}
          className={`${cell} ${open ? "flex" : collapsedClass(i)}`}
        >
          <Image src={`/brands/${name.toLowerCase()}.png`} alt="" width={64} height={44} className="h-10 w-14 object-contain transition group-hover:scale-110 sm:h-11 sm:w-16" />
          <span className="max-w-full truncate text-[11px] font-medium text-slate-500 group-hover:text-slate-900 sm:text-xs">{name}</span>
        </Link>
      ))}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className={`${cell} flex`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 ring-1 ring-inset ring-slate-200 transition group-hover:text-slate-900 group-hover:ring-slate-300 sm:h-11 sm:w-11">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
        <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 sm:text-xs">{open ? "Show less" : "More"}</span>
      </button>
    </div>
  );
}
