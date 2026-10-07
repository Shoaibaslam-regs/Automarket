"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Copy, LayoutDashboard, Plus, Sparkles, Fuel, Gauge, Cog, ImageOff, KeyRound, MapPin, Repeat, Tag, Car, type LucideIcon,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import Select from "@/components/ui/Select";

const MAKES = ["Toyota", "Honda", "Suzuki", "Yamaha", "Kawasaki", "BMW", "Mercedes", "Hyundai", "Kia", "Ford", "Other"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic"];
const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"];
const MAX_YEAR = new Date().getFullYear() + 1;

const LISTING_TYPES: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "SALE", label: "For Sale", hint: "Sell it outright", icon: Tag },
  { value: "RENT", label: "For Rent", hint: "Earn from daily rentals", icon: KeyRound },
  { value: "BOTH", label: "Sale & Rent", hint: "Open to either", icon: Repeat },
];

const STEPS: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: "Vehicle info", hint: "The basics buyers search for", icon: Car },
  { label: "Details", hint: "Photos, specs and description", icon: ClipboardList },
  { label: "Pricing", hint: "Set your price and rental rates", icon: Tag },
];

type FormState = {
  title: string; description: string; price: string;
  type: string; condition: string;
  make: string; model: string; year: string;
  mileage: string; color: string; fuelType: string;
  transmission: string; location: string;
  images: string[];
  dailyRate: string; weeklyRate: string; monthlyRate: string;
  deposit: string; availableFrom: string;
};

const INITIAL_FORM: FormState = {
  title: "", description: "", price: "",
  type: "SALE", condition: "GOOD",
  make: "", model: "", year: "",
  mileage: "", color: "", fuelType: "",
  transmission: "", location: "",
  images: [],
  dailyRate: "", weeklyRate: "", monthlyRate: "",
  deposit: "", availableFrom: "",
};

const inputClass =
  "block h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:text-sm";
const selectClass = "h-11 text-base font-normal text-slate-900 sm:text-sm";

function Field({ label, hint, htmlFor, children, optional }: {
  label: string; hint?: string; htmlFor?: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold text-slate-800">
        {label}
        {optional && <span className="text-[11px] font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// Number input with a fixed "PKR" adornment
function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">PKR</span>
      <input type="number" inputMode="numeric" min={0} {...props} className={`${inputClass} pl-12`} />
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function SellPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [published, setPublished] = useState<{ id: string; type: string; price: number } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setField(name: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const isRental = form.type === "RENT" || form.type === "BOTH";
  // Rent-only listings have no sale price; their listing price is the daily rate
  // (cards already show RENT prices as "/day"), so the API's required price is still satisfied.
  const showSalePrice = form.type !== "RENT";

  // Only the current step's fields are mounted, so this validates just that step
  function goNext() {
    if (formRef.current && !formRef.current.reportValidity()) return;
    setError("");
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Enter key on steps 1–2 advances instead of publishing a half-filled listing
    if (step < 3) { goNext(); return; }
    if (!session?.user) { router.push("/login"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: showSalePrice ? Number(form.price) : Number(form.dailyRate),
        year: Number(form.year),
        mileage: form.mileage ? Number(form.mileage) : undefined,
        dailyRate: isRental && form.dailyRate ? Number(form.dailyRate) : undefined,
        weeklyRate: isRental && form.weeklyRate ? Number(form.weeklyRate) : undefined,
        monthlyRate: isRental && form.monthlyRate ? Number(form.monthlyRate) : undefined,
        deposit: isRental && form.deposit ? Number(form.deposit) : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    // Show the success screen instead of jumping straight to the listing
    setPublished({ id: data.listing._id, type: data.listing.type, price: data.listing.price });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Live preview values
  const previewPrice = showSalePrice ? form.price : form.dailyRate;
  const previewSpecs = [
    form.mileage && { icon: Gauge, label: `${Number(form.mileage).toLocaleString()} km` },
    form.fuelType && { icon: Fuel, label: form.fuelType },
    form.transmission && { icon: Cog, label: form.transmission },
  ].filter(Boolean) as { icon: LucideIcon; label: string }[];
  const typeLabel = LISTING_TYPES.find(t => t.value === form.type)?.label;

  function listAnother() {
    setForm(INITIAL_FORM);
    setStep(1);
    setPublished(null);
    setCopied(false);
    window.scrollTo({ top: 0 });
  }

  async function copyLink() {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/listings/${published.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the link is still one tap away via "View listing" */ }
  }

  if (published) {
    const listingUrl = `/listings/${published.id}`;
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-[560px]">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CheckCircle2 size={28} strokeWidth={2} />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Published</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your listing is live</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Buyers{published.type !== "SALE" && " and renters"} can now find your vehicle on AutoMarket.
              {published.type !== "SALE" && " Booking requests will show up in your Bookings."}
            </p>
          </div>

          {/* Summary of what was published */}
          <div className="mt-7 rounded-[22px] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
            <div className="flex gap-3 p-1.5 sm:gap-4">
              <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-32">
                {form.images[0] ? (
                  <Image src={form.images[0]} alt={form.title} fill sizes="128px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400"><ImageOff size={20} strokeWidth={1.5} /></div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{typeLabel}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{form.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{form.make} {form.model} · {form.year} · {form.location}</p>
                <p className="mt-1.5 text-base font-bold tracking-tight text-slate-900">
                  <span className="mr-1 text-[11px] font-semibold text-slate-400">PKR</span>
                  {published.price.toLocaleString()}
                  {published.type === "RENT" && <span className="ml-0.5 text-xs font-medium text-slate-400">/day</span>}
                </p>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{listingUrl}</span>
              <button type="button" onClick={copyLink}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300">
                {copied ? <Check size={13} strokeWidth={2.5} className="text-emerald-600" /> : <Copy size={13} strokeWidth={2} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          {/* Next steps */}
          {/* Side by side on every screen; labels shorten on narrow phones so both always fit */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Link href={listingUrl}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] sm:text-sm">
              <span className="truncate">View listing</span>
              <ArrowRight size={15} strokeWidth={2} className="flex-shrink-0" />
            </Link>
            <button type="button" onClick={listAnother}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:text-sm">
              <Plus size={15} strokeWidth={2} className="flex-shrink-0" />
              <span className="truncate">List another<span className="hidden min-[400px]:inline"> vehicle</span></span>
            </button>
          </div>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Link href={`${listingUrl}/inspect`}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:border-slate-300">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Sparkles size={16} strokeWidth={1.75} /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900">Run AI inspection</span>
                <span className="block text-xs text-slate-500">Add an inspection report to your listing</span>
              </span>
            </Link>
            <Link href="/dashboard"
              className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:border-slate-300">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><LayoutDashboard size={16} strokeWidth={1.75} /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900">Go to dashboard</span>
                <span className="block text-xs text-slate-500">Manage all your listings</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-[1120px] px-4 pb-6 pt-7 sm:px-6 sm:pb-8 sm:pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sell or rent</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">List your vehicle</h1>
          <p className="mt-1.5 text-sm text-slate-500">A few details and your listing is live on AutoMarket.</p>

          {/* Stepper */}
          <nav aria-label="Listing progress" className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-4 sm:px-6 sm:py-5">
            <ol className="flex items-start">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                const Icon = s.icon;
                return (
                  <li key={s.label} className={`flex min-w-0 items-start ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                    {/* Completed steps can be revisited; upcoming ones unlock via Continue so each step stays validated */}
                    <button
                      type="button"
                      onClick={() => done && setStep(n)}
                      disabled={!done}
                      aria-current={active ? "step" : undefined}
                      className="group flex min-w-0 flex-col items-center gap-2 text-center disabled:cursor-default sm:flex-row sm:gap-3 sm:text-left"
                    >
                      <span
                        className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition sm:h-11 sm:w-11 ${
                          done
                            ? "border-emerald-500 bg-emerald-500 text-white group-hover:bg-emerald-600"
                            : active
                            ? "border-slate-900 bg-slate-900 text-white shadow-[0_0_0_5px_rgba(15,23,42,0.08)]"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {done ? <Check size={18} strokeWidth={2.75} /> : <Icon size={18} strokeWidth={1.75} />}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[10px] font-bold uppercase tracking-wider ${done ? "text-emerald-600" : active ? "text-slate-500" : "text-slate-300"}`}>
                          {done ? "Done" : `Step ${n}`}
                        </span>
                        <span className={`block truncate text-xs font-semibold sm:text-sm ${active || done ? "text-slate-900" : "text-slate-400"}`}>
                          {s.label}
                        </span>
                        <span className="hidden truncate text-[11px] text-slate-400 lg:block">{s.hint}</span>
                      </span>
                    </button>

                    {i < STEPS.length - 1 && (
                      <span aria-hidden className="mx-2 mt-5 h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-slate-200 sm:mx-4 sm:mt-[21px]">
                        <span className={`block h-full rounded-full bg-emerald-500 transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form ref={formRef} onSubmit={handleSubmit} className="min-w-0">
            <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  {(() => { const Icon = STEPS[step - 1].icon; return <Icon size={17} strokeWidth={1.75} />; })()}
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">{STEPS[step - 1].label}</h2>
                  <p className="text-xs text-slate-500">Step {step} of 3 · {STEPS[step - 1].hint}</p>
                </div>
              </div>

              <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                {error && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">{error}</div>
                )}

                {step === 1 && (
                  <>
                    <div className="space-y-3">
                      <SectionTitle title="Listing type" hint="This decides which prices you'll set in the last step." />
                      <div role="radiogroup" aria-label="Listing type" className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3">
                        {LISTING_TYPES.map(({ value, label, hint, icon: Icon }) => {
                          const selected = form.type === value;
                          return (
                            <button
                              type="button"
                              key={value}
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setField("type", value)}
                              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition min-[480px]:flex-col min-[480px]:items-start min-[480px]:gap-2.5 ${
                                selected
                                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${selected ? "bg-white/15" : "bg-slate-100"}`}>
                                <Icon size={17} strokeWidth={1.75} />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">{label}</span>
                                <span className={`block text-xs ${selected ? "text-white/60" : "text-slate-400"}`}>{hint}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <SectionTitle title="Vehicle" />
                      <Field label="Listing title" htmlFor="title" hint="Make, model, year and a standout feature work best.">
                        <input id="title" name="title" value={form.title} onChange={handleChange} required
                          placeholder="e.g. Toyota Corolla 2020 — excellent condition" className={inputClass} />
                      </Field>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Make">
                          <Select name="make" value={form.make} onChange={v => setField("make", v)} required ariaLabel="Make"
                            options={[{ value: "", label: "Select make" }, ...MAKES.map(m => ({ value: m, label: m }))]}
                            className={selectClass} />
                        </Field>
                        <Field label="Model" htmlFor="model">
                          <input id="model" name="model" value={form.model} onChange={handleChange} required
                            placeholder="e.g. Corolla, Civic" className={inputClass} />
                        </Field>
                        <Field label="Year" htmlFor="year">
                          <input id="year" name="year" type="number" inputMode="numeric" value={form.year} onChange={handleChange} required
                            placeholder="2020" min="1990" max={MAX_YEAR} className={inputClass} />
                        </Field>
                        <Field label="Condition">
                          <Select name="condition" value={form.condition} onChange={v => setField("condition", v)} ariaLabel="Condition"
                            options={CONDITIONS.map(c => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))}
                            className={selectClass} />
                        </Field>
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-3">
                      <SectionTitle title="Photos" hint="The first image is your main photo. Upload up to 8 images." />
                      <ImageUpload
                        images={form.images}
                        onChange={(urls) => setForm((prev) => ({ ...prev, images: urls }))}
                      />
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <SectionTitle title="Specifications" />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Mileage (km)" htmlFor="mileage" optional>
                          <input id="mileage" name="mileage" type="number" inputMode="numeric" min={0} value={form.mileage} onChange={handleChange}
                            placeholder="e.g. 45000" className={inputClass} />
                        </Field>
                        <Field label="Color" htmlFor="color" optional>
                          <input id="color" name="color" value={form.color} onChange={handleChange}
                            placeholder="e.g. White" className={inputClass} />
                        </Field>
                        <Field label="Fuel type" optional>
                          <Select name="fuelType" value={form.fuelType} onChange={v => setField("fuelType", v)} ariaLabel="Fuel type"
                            options={[{ value: "", label: "Select fuel type" }, ...FUEL_TYPES.map(f => ({ value: f, label: f }))]}
                            className={selectClass} />
                        </Field>
                        <Field label="Transmission" optional>
                          <Select name="transmission" value={form.transmission} onChange={v => setField("transmission", v)} ariaLabel="Transmission"
                            options={[{ value: "", label: "Select transmission" }, ...TRANSMISSIONS.map(t => ({ value: t, label: t }))]}
                            className={selectClass} />
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <SectionTitle title="Location & description" />
                      <Field label="Location" htmlFor="location">
                        <div className="relative">
                          <MapPin size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input id="location" name="location" value={form.location} onChange={handleChange} required
                            placeholder="e.g. Karachi, Lahore" className={`${inputClass} pl-10`} />
                        </div>
                      </Field>
                      <Field label="Description" htmlFor="description">
                        <textarea id="description" name="description" value={form.description} onChange={handleChange} required
                          rows={5} placeholder="Describe the vehicle condition, history, features..."
                          className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:text-sm" />
                      </Field>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    {showSalePrice && (
                      <div className="space-y-4">
                        <SectionTitle title="Sale price" hint="What you're asking for the vehicle." />
                        <Field label={isRental ? "Sale price" : "Price"} htmlFor="price">
                          <MoneyInput id="price" name="price" value={form.price} onChange={handleChange} required placeholder="e.g. 3500000" />
                        </Field>
                      </div>
                    )}

                    {isRental && (
                      <div className={`space-y-4 ${showSalePrice ? "border-t border-slate-100 pt-6" : ""}`}>
                        <SectionTitle title="Rental rates" hint="The daily rate is required; weekly and monthly rates are optional." />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Field label="Daily" htmlFor="dailyRate">
                            <MoneyInput id="dailyRate" name="dailyRate" value={form.dailyRate} onChange={handleChange} required placeholder="5000" />
                          </Field>
                          <Field label="Weekly" htmlFor="weeklyRate" optional>
                            <MoneyInput id="weeklyRate" name="weeklyRate" value={form.weeklyRate} onChange={handleChange} placeholder="30000" />
                          </Field>
                          <Field label="Monthly" htmlFor="monthlyRate" optional>
                            <MoneyInput id="monthlyRate" name="monthlyRate" value={form.monthlyRate} onChange={handleChange} placeholder="100000" />
                          </Field>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Security deposit" htmlFor="deposit" optional hint="Refundable, collected at pickup.">
                            <MoneyInput id="deposit" name="deposit" value={form.deposit} onChange={handleChange} placeholder="20000" />
                          </Field>
                          <Field label="Available from" htmlFor="availableFrom" optional hint="Leave empty to make it available today.">
                            <input id="availableFrom" name="availableFrom" type="date" value={form.availableFrom} onChange={handleChange}
                              className={`${inputClass} appearance-none`} />
                          </Field>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                {step > 1 ? (
                  <button type="button" onClick={goBack}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <ArrowLeft size={15} strokeWidth={2} /> Back
                  </button>
                ) : <span className="hidden sm:block" />}
                {step < 3 ? (
                  <button type="button" onClick={goNext}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                    {loading ? "Publishing..." : "Publish listing"}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Live preview */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Live preview</p>
            <div className="rounded-[22px] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                {form.images[0] ? (
                  <Image src={form.images[0]} alt="Main photo" fill sizes="320px" className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
                    <ImageOff size={22} strokeWidth={1.5} />
                    <span className="text-xs">Your main photo</span>
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur">
                  {typeLabel}
                </span>
                {form.year && (
                  <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/35 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">{form.year}</span>
                )}
              </div>
              <div className="px-2 pb-2 pt-3">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {form.make || "Make"} · {form.model || "Model"}
                </p>
                <p className="mt-1 line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-snug text-slate-900">
                  {form.title || <span className="text-slate-300">Your listing title</span>}
                </p>
                <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">
                  <span className="mr-1 text-xs font-semibold text-slate-400">PKR</span>
                  {previewPrice ? Number(previewPrice).toLocaleString() : "—"}
                  {form.type === "RENT" && <span className="ml-0.5 text-xs font-medium text-slate-400">/day</span>}
                </p>
                {form.type === "BOTH" && form.dailyRate && (
                  <p className="text-xs text-emerald-700">or PKR {Number(form.dailyRate).toLocaleString()}/day to rent</p>
                )}
                {previewSpecs.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {previewSpecs.map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                        <Icon size={12} strokeWidth={1.75} className="text-slate-400" />{label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  <MapPin size={13} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate">{form.location || "Location"}</span>
                </p>
              </div>
            </div>
            <p className="mt-3 px-1 text-xs leading-relaxed text-slate-400">
              Listings with clear photos and a detailed description get noticeably more enquiries.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
