"use client";

import PriceChart from "@/components/fuel/PriceChart";
import type { FuelPageData } from "@/lib/publicFuel";

/** The fuel page's chart (PriceChart): Pakistan's approved petrol and diesel prices, with series tabs and 7D–1Y ranges. */
export default function FuelCharts({ pkHistory }: Pick<FuelPageData, "pkHistory">) {
  const pk = (k: "petrol" | "diesel") => pkHistory.flatMap(d => (d[k] == null ? [] : [{ date: d.date, value: d[k]! }]));
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Price trends</h2>
      <PriceChart title="Pakistan" subtitle="Approved official prices, PKR per litre" prefix="PKR" unit="/ litre" riseIsBad
        series={[{ key: "petrol", label: "Petrol", points: pk("petrol") }, { key: "diesel", label: "Diesel", points: pk("diesel") }]} />
    </div>
  );
}
