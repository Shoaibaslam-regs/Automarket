import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Fuel, Info, Minus, Newspaper } from "lucide-react";
import Footer from "@/components/Footer";
import FuelCharts from "@/components/fuel/FuelCharts";
import UpdatedTag from "@/components/fuel/UpdatedTag";
import { getFuelPageData, latestCheck, type PkPrice } from "@/lib/publicFuel";
import { FUEL_LABEL, fuelDate, fuelTime, pkDayKey, priceChange } from "@/lib/fuelPrices";
import { reportError } from "@/lib/errorLog";

// Cached for everyone and cleared on every approval, edit and removal (invalidateFuel); never reads the session
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Petrol & diesel prices in Pakistan today",
  description: "Pakistan's official petrol and diesel prices from OGRA, with the latest changes and trends.",
  alternates: { canonical: "/fuel-prices" },
};

/** Days after which an approved price is shown as possibly out of date (prices change daily) */
const STALE_DAYS = 3;

function Change({ diff, pct, unit }: { diff: number | null; pct: number | null; unit: string }) {
  if (diff == null) return <span className="text-slate-400">No earlier price to compare</span>;
  if (diff === 0) return <span className="inline-flex items-center gap-1 text-slate-500"><Minus size={14} /> No change</span>;
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // For fuel, a rise is bad news for drivers (rose) and a fall good news (emerald)
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-rose-600" : "text-emerald-600"}`}>
      <Icon size={15} /> {up ? "+" : "−"}{unit} {Math.abs(diff).toFixed(2)}{pct != null && <span className="font-medium"> ({up ? "+" : "−"}{Math.abs(pct).toFixed(2)}%)</span>}
    </span>
  );
}

function PkCard({ type, p, today }: { type: "PETROL" | "DIESEL"; p?: PkPrice; today: string }) {
  const stale = p && (new Date(`${today}T00:00:00+05:00`).getTime() - new Date(`${p.effectiveDate}T00:00:00+05:00`).getTime()) / 86_400_000 > STALE_DAYS;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[13px] font-semibold text-slate-500">{FUEL_LABEL[type].name}</p>
      {p ? (
        <>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
            <span className="mr-1 text-base font-semibold text-slate-400">PKR</span>{p.price.toFixed(2)}<span className="ml-1 text-sm font-medium text-slate-400">/ litre</span>
          </p>
          <p className="mt-2 text-sm"><Change diff={p.diff} pct={p.pct} unit="PKR" /></p>
          <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div><dt className="inline">Effective from </dt><dd className="inline font-semibold text-slate-700">{fuelDate(p.effectiveDate)}</dd></div>
            <div><dt className="inline">Verified </dt><dd className="inline">{fuelTime(p.approvedAt)}</dd></div>
            <div>
              <dt className="inline">Source: </dt>
              <dd className="inline">{p.notificationUrl ? <a href={p.notificationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">{p.source} <ExternalLink size={11} /></a> : p.source}</dd>
            </div>
          </dl>
          {stale && <p className="mt-2 text-xs font-medium text-amber-700">This is the last verified price. A newer official price may have been announced.</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Not available yet. Prices appear once the AutoGO team has checked the official notification.</p>
      )}
    </div>
  );
}

/** /fuel-prices: Pakistan's approved petrol and diesel prices, their trend and the latest changes. */
export default async function FuelPricesPage() {
  const data = await getFuelPageData().catch(err => {
    reportError("Fuel page failed:", err);
    return null;
  });
  const today = pkDayKey(new Date());

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-12 pt-12 text-white sm:pt-16">
        <div className="relative mx-auto max-w-[1180px]">
          <Link href="/blog" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/10">
            <Newspaper size={13} /> AutoGO Blog
          </Link>
          <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl"><Fuel size={30} className="text-sky-300" /> Fuel prices</h1>
          <p className="mt-1.5"><UpdatedTag dark at={latestCheck(data)} /></p>
          <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-slate-400">
            Pakistan&apos;s official petrol and diesel prices, taken from OGRA&apos;s daily price publications.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 sm:py-10">
        {!data ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Fuel size={24} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">Fuel prices can&apos;t be shown right now</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Please try again in a few minutes.</p>
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Pakistan <span className="text-sm font-medium text-slate-400">PKR per litre</span></h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <PkCard type="PETROL" p={data.pk.PETROL} today={today} />
                <PkCard type="DIESEL" p={data.pk.DIESEL} today={today} />
              </div>
            </section>


            <FuelCharts pkHistory={data.pkHistory} />

            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Price changes</h2>
              {data.news.length === 0 ? (
                <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-slate-500 ring-1 ring-inset ring-slate-200">No verified price changes yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-slate-200/80">
                  {data.news.map(n => (
                    <li key={n.date} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
                      <div className="min-w-0 sm:w-44">
                        <p className="text-sm font-semibold text-slate-900">From {fuelDate(n.date)}</p>
                        {n.notificationUrl && (
                          <a href={n.notificationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">Official release <ExternalLink size={11} /></a>
                        )}
                      </div>
                      <div className="grid flex-1 gap-1.5 text-[13px] sm:grid-cols-2">
                        {([["Petrol", n.previousPetrol, n.petrol], ["Diesel", n.previousDiesel, n.diesel]] as const).map(([label, before, after]) => {
                          const ch = after != null ? priceChange(before, after) : null;
                          return (
                            <p key={label} className="text-slate-600">
                              <span className="font-semibold text-slate-900">{label}</span>{" "}
                              {before != null && <span className="tabular-nums">{before.toFixed(2)} → </span>}
                              <span className="font-semibold tabular-nums text-slate-900">{after?.toFixed(2) ?? "—"}</span>{" "}
                              {ch && <Change diff={ch.diff} pct={null} unit="PKR" />}
                            </p>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="flex gap-2 rounded-xl bg-white p-4 text-xs leading-relaxed text-slate-500 ring-1 ring-inset ring-slate-200/80">
              <Info size={15} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <span>
                Pakistani prices are taken from OGRA&apos;s daily price publications at{" "}
                <a href="https://ogra.org.pk/index.php/price-publications" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">ogra.org.pk</a>{" "}
                (the Petroleum Division&apos;s releases when OGRA can&apos;t be reached){" "}
                and updated daily; unusual changes are checked by the AutoGO team before they appear. Pump prices can differ slightly by city and company.
              </span>
            </p>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
