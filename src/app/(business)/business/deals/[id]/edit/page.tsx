"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DealForm, { toInputDate, type DealFormValues } from "@/components/business/DealForm";

type DealDoc = Omit<DealFormValues, "year" | "mileage" | "price" | "discountValue" | "startsAt" | "endsAt" | "description" | "fuelType" | "transmission" | "color"> & {
  description?: string; fuelType?: string; transmission?: string; color?: string;
  year: number; mileage?: number; price: number; discountValue: number; startsAt: string; endsAt: string;
};

const toForm = (d: DealDoc): DealFormValues => ({
  title: d.title, description: d.description ?? "", make: d.make, model: d.model, year: String(d.year),
  mileage: d.mileage != null ? String(d.mileage) : "", fuelType: d.fuelType ?? "", transmission: d.transmission ?? "", color: d.color ?? "",
  condition: d.condition, location: d.location, images: d.images, price: String(d.price),
  discountType: d.discountType, discountValue: String(d.discountValue),
  startsAt: toInputDate(new Date(d.startsAt)), endsAt: toInputDate(new Date(d.endsAt)),
});

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<DealFormValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/business/deals/${id}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't load this deal");
        if (!d.permissions?.canManage) throw new Error("Only the owner or a manager can edit deals");
        setInitial(toForm(d.deal));
      })
      .catch(e => setError(e.message));
  }, [id]);

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/deals" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Deals</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Edit deal</h1>
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div>
        ) : !initial ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="h-96 animate-pulse rounded-2xl bg-white" />
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : (
          <DealForm initial={initial} dealId={id} />
        )}
      </div>
    </div>
  );
}
