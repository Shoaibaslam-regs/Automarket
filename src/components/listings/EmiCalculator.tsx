"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { formatLakh } from "@/lib/format";

const TENURES = [1, 2, 3, 4, 5];

/** Standard reducing-balance car loan installment. */
function monthlyInstallment(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;

export default function EmiCalculator({ price }: { price: number }) {
  const [downPct, setDownPct] = useState(30);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState("18");

  const annualRate = Math.min(60, Math.max(0, Number(rate) || 0));
  const down = (price * downPct) / 100;
  const financed = price - down;
  const months = years * 12;
  const emi = monthlyInstallment(financed, annualRate, months);
  const totalInterest = emi * months - financed;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Calculator size={16} className="text-gray-400" />
        Financing calculator
      </h2>

      <div className="rounded-xl bg-slate-900 p-4 text-white">
        <p className="text-xs text-slate-400">Estimated monthly installment</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{pkr(emi)}</p>
        <p className="mt-0.5 text-xs text-slate-400">for {months} months</p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <label htmlFor="emi-down" className="font-medium text-gray-600">Down payment</label>
            <span className="font-semibold text-gray-900">{downPct}% · PKR {formatLakh(down)}</span>
          </div>
          <input
            id="emi-down"
            type="range"
            min={10}
            max={90}
            step={5}
            value={downPct}
            onChange={e => setDownPct(Number(e.target.value))}
            className="w-full accent-slate-900"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">Loan tenure</p>
          <div className="grid grid-cols-5 gap-1.5">
            {TENURES.map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                aria-pressed={years === y}
                className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                  years === y ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100"
                }`}
              >
                {y}y
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="emi-rate" className="text-xs font-medium text-gray-600">Interest rate (yearly)</label>
          <div className="relative w-24">
            <input
              id="emi-rate"
              type="number"
              inputMode="decimal"
              min={0}
              max={60}
              step={0.5}
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-2.5 pr-7 text-right text-sm font-semibold text-gray-900 outline-none focus:border-slate-900"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Loan amount</dt>
          <dd className="font-medium text-gray-900">{pkr(financed)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Total interest</dt>
          <dd className="font-medium text-gray-900">{pkr(totalInterest)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Total cost</dt>
          <dd className="font-semibold text-gray-900">{pkr(down + emi * months)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        Indicative only. Actual rates, insurance and fees vary by bank. Check with your bank before applying.
      </p>
    </div>
  );
}
