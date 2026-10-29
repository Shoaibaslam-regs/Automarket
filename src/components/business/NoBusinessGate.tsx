"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

/** Pages that work without a business: registering one, the tutorial, and the two that redirect to onboarding themselves */
const OPEN_PATHS = ["/business/onboarding", "/business/guide"];
const REDIRECTING = ["/business", "/business/dashboard"];

/**
 * Shows "No business registered" instead of a console page when the signed-in account has no business, so
 * Customers, Staff, Inventory, Help & support and the rest don't open empty forms. The APIs refuse independently.
 */
export default function NoBusinessGate({ noBusiness, children }: { noBusiness: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  if (!noBusiness || REDIRECTING.includes(pathname) || OPEN_PATHS.some(p => pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-[var(--gh-f6f8fa)] p-4 md:min-h-screen">
      <div className="w-full max-w-md rounded-2xl border border-[var(--gh-e1e4e8)] bg-white px-6 py-8 text-center shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]">
        <span className="mx-auto flex items-center justify-center text-[var(--gh-57606a)]"><Building2 size={24} /></span>
        <h1 className="mt-3 text-lg font-bold text-[var(--gh-0d1117)]">No business registered</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--gh-57606a)]">
          This page is part of the business console. Register your showroom or rental business to manage inventory, customers, staff and
          bookings, and to contact business support.
        </p>
        <Link href="/business/onboarding" className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--gh-0d1117)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--gh-24292f)]">
          Register your business
        </Link>
        <Link href="/" className="mt-3 block text-xs font-semibold text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">Back to the marketplace</Link>
      </div>
    </div>
  );
}
