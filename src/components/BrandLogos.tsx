"use client";

import Link from "next/link";

const BRANDS = [
  {
    name: "Toyota",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <ellipse cx="50" cy="50" rx="45" ry="45" fill="none" stroke="#EB0A1E" strokeWidth="4"/>
        <ellipse cx="50" cy="50" rx="28" ry="18" fill="none" stroke="#EB0A1E" strokeWidth="4"/>
        <ellipse cx="50" cy="35" rx="13" ry="18" fill="none" stroke="#EB0A1E" strokeWidth="4"/>
      </svg>
    ),
  },
  {
    name: "Honda",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#CC0000"/>
        <text x="50" y="68" textAnchor="middle" fill="white" fontSize="52" fontWeight="bold" fontFamily="Arial">H</text>
      </svg>
    ),
  },
  {
    name: "Suzuki",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#1a1a2e"/>
        <text x="50" y="68" textAnchor="middle" fill="white" fontSize="48" fontWeight="bold" fontFamily="Arial">S</text>
      </svg>
    ),
  },
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
  {
    name: "BMW",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <circle cx="50" cy="50" r="44" fill="#1C69D4" stroke="#1C69D4" strokeWidth="2"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#1C69D4" strokeWidth="6"/>
        <path d="M50 6 A44 44 0 0 1 94 50 L50 50 Z" fill="white"/>
        <path d="M50 94 A44 44 0 0 1 6 50 L50 50 Z" fill="white"/>
        <circle cx="50" cy="50" r="14" fill="none" stroke="#1C69D4" strokeWidth="3"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#1C69D4" strokeWidth="6"/>
      </svg>
    ),
  },
  {
    name: "Hyundai",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#002C5F"/>
        <text x="50" y="68" textAnchor="middle" fill="white" fontSize="48" fontWeight="bold" fontFamily="Arial" fontStyle="italic">H</text>
      </svg>
    ),
  },
  {
    name: "Kia",
    svg: (
      <svg viewBox="0 0 100 100" className="w-10 h-10">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#05141F"/>
        <text x="50" y="66" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" fontFamily="Arial">KIA</text>
      </svg>
    ),
  },
];

export default function BrandLogos() {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3 md:grid-cols-8">
      {BRANDS.map((brand) => (
        <Link key={brand.name} href={`/listings?make=${encodeURIComponent(brand.name)}`}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-2 py-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.3)]">
          <span className="transition group-hover:scale-110">{brand.svg}</span>
          <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 sm:text-xs">{brand.name}</span>
        </Link>
      ))}
    </div>
  );
}
