"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DealForm, { CITIES, blankDeal, type DealFormValues } from "@/components/business/DealForm";
import LimitReachedCard from "@/components/subscription/LimitReachedCard";
import { atLimit, useSubscription } from "@/components/subscription/useSubscription";
import { formatLimit } from "@/lib/plans";

export default function NewDealPage() {
  // Starts with the business's own address and city from Business settings, so most deals need no typing there
  const [initial, setInitial] = useState<DealFormValues | null>(null);
  useEffect(() => {
    fetch("/api/business/organizations")
      .then(r => r.json())
      .then(d => {
        const org = d.organization as { address?: string; city?: string } | null;
        const city = org?.city && CITIES.find(c => c.toLowerCase() === org.city!.toLowerCase());
        setInitial({ ...blankDeal(), address: org?.address ?? "", location: city || "" });
      })
      .catch(() => setInitial(blankDeal()));
  }, []);
  // Deals share the plan's monthly listing quota
  const { data: sub } = useSubscription();
  const full = !!sub && atLimit(sub.usage.listings, sub.limits.listings);
  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/deals" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Deals</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">New deal</h1>
        <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">
          A special offer with its own photos and details. You don&apos;t need to list the vehicle first.
          {sub && sub.limits.listings !== null && <> · {sub.usage.listings} of {formatLimit(sub.limits.listings)} listings &amp; deals used this month</>}
        </p>
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
        {full && sub ? (
          <LimitReachedCard
            kind="listings"
            planId={sub.planId}
            used={sub.usage.listings}
            limit={sub.limits.listings}
            hint="Listings and deals share your plan's monthly quota, and deleted ones still count. Upgrade to post more, or wait until next month."
          />
        ) : !initial ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-96 animate-pulse rounded-2xl bg-white" />
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : (
          <DealForm initial={initial} />
        )}
      </div>
    </div>
  );
}
