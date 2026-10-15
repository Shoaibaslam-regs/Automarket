"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import SaleSlip, { type SaleSlipData } from "@/components/sales/SaleSlip";

/** The buyer's copy of a sale slip (one A4 page). */
export default function PurchaseSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SaleSlipData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Not found");
        setData(d);
      })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gh-f6f8fa)] p-6">
        <div className="rounded-2xl border border-[var(--gh-ffcdd2)] bg-white p-8 text-center">
          <p className="text-sm font-semibold text-[var(--gh-cf222e)]">{error}</p>
          <Link href="/purchases" className="mt-3 inline-block text-[13px] font-semibold text-[var(--gh-0d1117)] underline">Back to My purchases</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen animate-pulse bg-[var(--gh-f6f8fa)]" />;
  return <SaleSlip data={data} backHref="/purchases" backLabel="My purchases" showNotes={false} />;
}
