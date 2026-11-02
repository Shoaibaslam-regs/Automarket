"use client";

import PriceChart from "@/components/fuel/PriceChart";
import type { FuelPageData } from "@/lib/publicFuel";

/**
 * The fuel page's two charts (PriceChart): Pakistan's approved petrol and diesel prices as a step line (each price
 * holds until the next change), and Brent / WTI daily closes, each with series tabs and 7D–1Y ranges.
 */
export default function FuelCharts({ pkHistory, oilHistory }: Pick<FuelPageData, "pkHistory" | "oilHistory">) {
  const pk = (k: "petrol" | "diesel") => pkHistory.flatMap(d => (d[k] == null ? [] : [{ date: d.date, value: d[k]! }]));
  const oil = (c: "BRENT" | "WTI") => oilHistory[c].map(p => ({ date: p.date, value: p.price }));
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Price trends</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <PriceChart title="Pakistan" subtitle="Approved official prices, PKR per litre" prefix="PKR" unit="/ litre" step riseIsBad
          series={[{ key: "petrol", label: "Petrol", points: pk("petrol") }, { key: "diesel", label: "Diesel", points: pk("diesel") }]} />
        <PriceChart title="International crude" subtitle="Daily close, USD per barrel (Alpha Vantage / U.S. EIA)" prefix="$" unit="/ barrel"
          series={[{ key: "brent", label: "Brent", points: oil("BRENT") }, { key: "wti", label: "WTI", points: oil("WTI") }]} />
      </div>
    </div>
  );
}
