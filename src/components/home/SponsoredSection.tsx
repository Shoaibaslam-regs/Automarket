"use client";

import { useEffect, useState } from "react";
import SectionHeader from "@/components/home/SectionHeader";
import SponsoredRow from "@/components/home/SponsoredRow";
import { MY_CITY_KEY } from "@/lib/cities";
import type { SponsoredItem } from "@/lib/sponsored";

/**
 * The home page's "Featured businesses" row. The page is the same for everyone (cached), so the server sends an
 * All-Pakistan rotation and, when the visitor picked a city on Browse, this swaps in that city's ads
 * (GET /api/sponsored?city=), Top ads first. Hidden while no ads run.
 */
export default function SponsoredSection({ initial }: { initial: SponsoredItem[] }) {
  const [items, setItems] = useState(initial);
  useEffect(() => {
    if (!initial.length) return; // nothing runs anywhere
    let city = "";
    try { city = localStorage.getItem(MY_CITY_KEY) ?? ""; } catch {}
    if (!city) return;
    fetch(`/api/sponsored?city=${encodeURIComponent(city)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.items?.length) setItems(d.items); })
      .catch(() => {});
  }, [initial.length]);

  if (!items.length) return null;
  return (
    <section>
      <SectionHeader title="Featured businesses" line={false} />
      <SponsoredRow items={items} />
    </section>
  );
}
