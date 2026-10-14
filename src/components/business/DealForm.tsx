"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Car, Clock3, ImageOff, Percent, Tag } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Select from "@/components/ui/Select";
import { formatLakh } from "@/lib/format";
import { MAX_DEAL_IMAGES, MAX_PERCENT, dealLabel, dealPrice } from "@/lib/deals";
import { CONDITIONS, FUEL_TYPES, MAKES, TRANSMISSIONS, conditionLabel } from "@/lib/vehicleOptions";
import { FEDERAL_CAPITAL, PROVINCES } from "@/lib/provinces";
import { MAX_ADDRESS } from "@/lib/address";

export const CITIES = [...new Set([FEDERAL_CAPITAL, ...PROVINCES.flatMap(p => [p.capital, ...p.cities])])].sort((a, b) => a.localeCompare(b));

export type DealFormValues = {
  dealType: "SALE" | "RENT";
  /** Cars in a rent package */
  vehicleCount: string;
  deposit: string;
  title: string;
  description: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  color: string;
  condition: string;
  location: string;
  address: string;
  images: string[];
  price: string;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: string;
  startsAt: string;
  endsAt: string;
};

export const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function blankDeal(): DealFormValues {
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return {
    dealType: "SALE", vehicleCount: "1", deposit: "",
    title: "", description: "", make: "", model: "", year: String(new Date().getFullYear()), mileage: "", fuelType: "", transmission: "", color: "",
    condition: "EXCELLENT", location: "", address: "", images: [], price: "", discountType: "PERCENT", discountValue: "10",
    startsAt: toInputDate(new Date()), endsAt: toInputDate(end),
  };
}

const input = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const selectCls = "h-10 rounded-lg text-[13px] font-normal";

function Field({ label, htmlFor, optional, children }: { label: string; htmlFor?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-900">
        {label} {optional ? <span className="font-normal text-slate-400">(optional)</span> : <span className="text-rose-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: typeof Car; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><Icon size={17} /></span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Create or edit a stand-alone deal: its own photos, vehicle details, price, discount and dates.
 * `dealId` set means editing.
 */
export default function DealForm({ initial, dealId }: { initial: DealFormValues; dealId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof DealFormValues>(k: K, v: DealFormValues[K]) => setForm(p => ({ ...p, [k]: v }));

  const rent = form.dealType === "RENT";
  const price = Number(form.price) || 0;
  const discount = { discountType: form.discountType, discountValue: Number(form.discountValue) || 0 };
  const final = price > 0 && discount.discountValue > 0 ? dealPrice(price, discount) : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.images.length === 0) { setError("Add at least one photo of the vehicle"); return; }
    setSaving(true);
    setError("");
    const res = await fetch(dealId ? `/api/business/deals/${dealId}` : "/api/business/deals", {
      method: dealId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price, discountValue: discount.discountValue, vehicleCount: rent ? Number(form.vehicleCount) || 1 : 1, deposit: rent ? form.deposit : "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSaving(false); setError(data.error || "Failed to save the deal"); return; }
    router.push("/business/deals");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Section icon={Camera} title="Photos" hint={`Real photos of the vehicle on offer. The first is the main photo. Up to ${MAX_DEAL_IMAGES}.`}>
          <ImageUpload images={form.images} onChange={urls => set("images", urls)} maxImages={MAX_DEAL_IMAGES} />
        </Section>

        <Section icon={Car} title="Vehicle">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Make">
              <Select value={form.make} onChange={v => set("make", v)} ariaLabel="Make" required className={selectCls}
                options={[{ value: "", label: "Select make" }, ...MAKES.map(m => ({ value: m, label: m }))]} />
            </Field>
            <Field label="Model" htmlFor="deal-model">
              <input id="deal-model" required maxLength={60} value={form.model} onChange={e => set("model", e.target.value)} placeholder="Corolla Altis, CD 70…" className={input} />
            </Field>
            <Field label="Model year" htmlFor="deal-year">
              <input id="deal-year" type="number" required min={1950} max={new Date().getFullYear() + 1} value={form.year} onChange={e => set("year", e.target.value)} className={input} />
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onChange={v => set("condition", v)} ariaLabel="Condition" className={selectCls}
                options={CONDITIONS.map(c => ({ value: c, label: conditionLabel(c) }))} />
            </Field>
            <Field label="Mileage (km)" htmlFor="deal-mileage" optional>
              <input id="deal-mileage" type="number" min={0} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="25000" className={input} />
            </Field>
            <Field label="City">
              <Select value={form.location} onChange={v => set("location", v)} ariaLabel="City" required className={selectCls}
                options={[{ value: "", label: "Select city" }, ...CITIES.map(c => ({ value: c, label: c }))]} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Shop / pickup address" htmlFor="deal-address">
                <input id="deal-address" required minLength={5} maxLength={MAX_ADDRESS} value={form.address} onChange={e => set("address", e.target.value)}
                  placeholder="Shop 12, Main Shahrah-e-Faisal, near FTC" className={input} />
                <p className="mt-1 text-xs text-slate-500">Shown on the deal page, bookings and slips so customers know where to come.</p>
              </Field>
            </div>
            <Field label="Fuel" optional>
              <Select value={form.fuelType} onChange={v => set("fuelType", v)} ariaLabel="Fuel" className={selectCls}
                options={[{ value: "", label: "Not specified" }, ...FUEL_TYPES.map(f => ({ value: f, label: f }))]} />
            </Field>
            <Field label="Transmission" optional>
              <Select value={form.transmission} onChange={v => set("transmission", v)} ariaLabel="Transmission" className={selectCls}
                options={[{ value: "", label: "Not specified" }, ...TRANSMISSIONS.map(t => ({ value: t, label: t }))]} />
            </Field>
            <Field label="Colour" htmlFor="deal-color" optional>
              <input id="deal-color" maxLength={30} value={form.color} onChange={e => set("color", e.target.value)} placeholder="White" className={input} />
            </Field>
          </div>
        </Section>

        <Section icon={Tag} title="The deal" hint="What customers see first. Explain what makes this offer special.">
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-900">Deal type <span className="text-rose-600">*</span></span>
              <div role="radiogroup" aria-label="Deal type" className="grid grid-cols-2 gap-2">
                {([["SALE", "For sale", "A discounted vehicle to buy"], ["RENT", "For rent", "A rental package customers can book, e.g. cars for a wedding"]] as const).map(([v, label, hint]) => (
                  <button key={v} type="button" role="radio" aria-checked={form.dealType === v} onClick={() => set("dealType", v)}
                    className={`rounded-xl p-3 text-left ring-1 ring-inset transition ${form.dealType === v ? "bg-rose-50 ring-2 ring-rose-500" : "ring-slate-200 hover:bg-slate-50"}`}>
                    <span className="block text-sm font-semibold text-slate-900">{label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Title" htmlFor="deal-title">
              <input id="deal-title" required minLength={3} maxLength={80} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Eid offer: Corolla Altis 2022, free first service" className={input} />
            </Field>
            <Field label="Details" htmlFor="deal-desc" optional>
              <textarea id="deal-desc" rows={4} maxLength={2000} value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="What's included, warranty, registration, how long the offer lasts…" className={`${input} h-auto resize-y py-2.5`} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={rent ? "Normal price per day (PKR)" : "Normal price (PKR)"} htmlFor="deal-price">
                <input id="deal-price" type="number" required min={1} value={form.price} onChange={e => set("price", e.target.value)} placeholder="6500000" className={input} />
                {price > 0 && <p className="mt-1 text-xs text-slate-500">PKR {formatLakh(price)}</p>}
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-900">Discount <span className="text-rose-600">*</span></span>
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-1 ring-1 ring-inset ring-slate-200">
                    {(["PERCENT", "AMOUNT"] as const).map(t => (
                      <button key={t} type="button" onClick={() => set("discountType", t)} aria-pressed={form.discountType === t}
                        className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs font-semibold transition ${form.discountType === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
                        {t === "PERCENT" ? <><Percent size={12} /> Percent</> : "PKR"}
                      </button>
                    ))}
                  </div>
                  <input type="number" required min={1} max={form.discountType === "PERCENT" ? MAX_PERCENT : undefined} aria-label={form.discountType === "PERCENT" ? "Percent off" : "PKR off"}
                    value={form.discountValue} onChange={e => set("discountValue", e.target.value)} className={input} />
                </div>
              </div>
              {rent && (
                <>
                  <Field label="Cars in this package" htmlFor="deal-cars">
                    <input id="deal-cars" type="number" min={1} max={50} required value={form.vehicleCount} onChange={e => set("vehicleCount", e.target.value)} className={input} />
                    <p className="mt-1 text-xs text-slate-500">The price per day covers all of them. List the cars in the details.</p>
                  </Field>
                  <Field label="Security deposit (PKR)" htmlFor="deal-deposit" optional>
                    <input id="deal-deposit" type="number" min={0} value={form.deposit} onChange={e => set("deposit", e.target.value)} placeholder="20000" className={input} />
                  </Field>
                </>
              )}
              <Field label="Starts" htmlFor="deal-start">
                <input id="deal-start" type="date" required value={form.startsAt} onChange={e => set("startsAt", e.target.value)} className={input} />
              </Field>
              <Field label="Ends" htmlFor="deal-end">
                <input id="deal-end" type="date" required min={form.startsAt} value={form.endsAt} onChange={e => set("endsAt", e.target.value)} className={input} />
              </Field>
            </div>
          </div>
        </Section>
      </div>

      {/* Preview + actions */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Preview</p>
          <div className="relative aspect-[4/3] bg-slate-100">
            {form.images[0] ? (
              <Image src={form.images[0]} alt="" fill sizes="320px" className="object-cover" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-slate-400"><ImageOff size={24} /> Main photo</span>
            )}
            {discount.discountValue > 0 && (
              <span className="theme-static absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">
                {dealLabel(discount)}
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{form.make || "Make"} · {form.year || "Year"}</p>
            <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold text-slate-900">{form.title || "Your deal title"}</p>
            {final > 0 ? (
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-extrabold text-rose-600">PKR {formatLakh(final)}{rent && <span className="text-xs font-semibold">/day</span>}</span>
                <span className="text-xs text-slate-400 line-through">{formatLakh(price)}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Enter a price and discount to see the deal price.</p>
            )}
            {form.endsAt && (
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 size={12} /> Ends {new Date(form.endsAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {error && <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">{error}</div>}

        <div className="mt-3 grid gap-2">
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving…" : dealId ? "Save changes" : "Publish deal"}
          </button>
          <Link href="/business/deals" className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
            Cancel
          </Link>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Published deals appear on the Deals page and your business page between the start and end dates.{rent ? " Customers can book rent deals; the bookings show in Bookings with a DEAL tag." : ""}
        </p>
      </aside>
    </form>
  );
}
