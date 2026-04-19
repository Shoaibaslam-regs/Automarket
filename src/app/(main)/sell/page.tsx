"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/ui/ImageUpload";

const MAKES = ["Toyota", "Honda", "Suzuki", "Yamaha", "Kawasaki", "BMW", "Mercedes", "Hyundai", "Kia", "Ford", "Other"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic"];
const CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"];

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

export default function SellPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    title: "", description: "", price: "",
    type: "SALE", condition: "GOOD",
    make: "", model: "", year: "",
    mileage: "", color: "", fuelType: "",
    transmission: "", location: "",
    images: [],
    dailyRate: "", weeklyRate: "", monthlyRate: "",
    deposit: "", availableFrom: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) { router.push("/login"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        year: Number(form.year),
        mileage: form.mileage ? Number(form.mileage) : undefined,
        dailyRate: form.dailyRate ? Number(form.dailyRate) : undefined,
        weeklyRate: form.weeklyRate ? Number(form.weeklyRate) : undefined,
        monthlyRate: form.monthlyRate ? Number(form.monthlyRate) : undefined,
        deposit: form.deposit ? Number(form.deposit) : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push(`/listings/${data.listing._id}`);
  }

  const isRental = form.type === "RENT" || form.type === "BOTH";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Post a listing</h1>
        <p className="text-gray-500 text-sm mb-8">Fill in the details about your vehicle</p>

        <div className="flex gap-2 mb-8">
          {["Vehicle info", "Details", "Pricing"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition ${step > i + 1 ? "bg-green-500 text-white" :
                  step === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? "text-gray-900 font-medium" : "text-gray-400"}`}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing title</label>
                  <input name="title" value={form.title} onChange={handleChange} required
                    placeholder="e.g. Toyota Corolla 2020 — excellent condition"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <select name="make" value={form.make} onChange={handleChange} required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select make</option>
                      {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input name="model" value={form.model} onChange={handleChange} required
                      placeholder="e.g. Corolla, Civic"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input name="year" type="number" value={form.year} onChange={handleChange} required
                      placeholder="2020" min="1990" max="2025"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select name="condition" value={form.condition} onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing type</label>
                  <div className="flex gap-3">
                    {([["SALE", "For Sale"], ["RENT", "For Rent"], ["BOTH", "Sale & Rent"]] as [string, string][]).map(([val, label]) => (
                      <button type="button" key={val}
                        onClick={() => setForm((prev) => ({ ...prev, type: val }))}
                        className={`flex-1 py-2.5 text-sm rounded-lg border transition ${form.type === val ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle images
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    First image will be the main photo. Upload up to 8 images.
                  </p>
                  <ImageUpload
                    images={form.images}
                    onChange={(urls) => setForm((prev) => ({ ...prev, images: urls }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (km)</label>
                    <input name="mileage" type="number" value={form.mileage} onChange={handleChange}
                      placeholder="e.g. 45000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input name="color" value={form.color} onChange={handleChange}
                      placeholder="e.g. White"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
                    <select name="fuelType" value={form.fuelType} onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select fuel type</option>
                      {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                    <select name="transmission" value={form.transmission} onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select transmission</option>
                      {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input name="location" value={form.location} onChange={handleChange} required
                    placeholder="e.g. Karachi, Lahore"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} required
                    rows={4} placeholder="Describe the vehicle condition, history, features..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRental ? "Sale price (PKR)" : "Price (PKR)"}
                  </label>
                  <input name="price" type="number" value={form.price} onChange={handleChange} required
                    placeholder="e.g. 3500000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {isRental && (
                  <>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-3">Rental rates</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Daily (PKR)</label>
                          <input name="dailyRate" type="number" value={form.dailyRate} onChange={handleChange}
                            required={isRental} placeholder="5000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Weekly (PKR)</label>
                          <input name="weeklyRate" type="number" value={form.weeklyRate} onChange={handleChange}
                            placeholder="30000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Monthly (PKR)</label>
                          <input name="monthlyRate" type="number" value={form.monthlyRate} onChange={handleChange}
                            placeholder="100000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Security deposit (PKR)</label>
                        <input name="deposit" type="number" value={form.deposit} onChange={handleChange}
                          placeholder="20000"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Available from</label>
                        <input name="availableFrom" type="date" value={form.availableFrom} onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="px-6 py-2.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition">
                Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Publishing..." : "Publish listing"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}