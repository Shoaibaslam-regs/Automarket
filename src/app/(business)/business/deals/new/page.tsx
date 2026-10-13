"use client";

import { useState } from "react";
import Link from "next/link";
import DealForm, { blankDeal } from "@/components/business/DealForm";

export default function NewDealPage() {
  // Created once on mount so the default dates don't change while the form is open
  const [initial] = useState(blankDeal);
  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/deals" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Deals</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">New deal</h1>
        <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">A special offer with its own photos and details. You don&apos;t need to list the vehicle first.</p>
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
        <DealForm initial={initial} />
      </div>
    </div>
  );
}
