"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVAILABILITY_LABEL, availabilityOptions, type Availability } from "@/lib/availability";

const ACTIVE_STYLE: Record<Availability, string> = {
  ACTIVE: "bg-emerald-600 text-white",
  SOLD: "bg-slate-900 text-white",
  RENTED: "bg-sky-600 text-white",
};

/**
 * Lets the owner (or their business team) mark a listing Available, Sold or Rented.
 * Sold and rented vehicles stay visible to buyers with a tag, so they move on to other vehicles.
 * Refreshes the page's server data after a change; `onChanged` lets client pages reload their own lists.
 */
export default function AvailabilityControl({ id, type, status, onChanged, size = "sm", allow }: {
  id: string;
  type: string;
  status: string;
  onChanged?: (status: Availability) => void;
  size?: "sm" | "md";
  /** Only offer these tags, e.g. bookings offer Available/Rented and inventory Available/Sold */
  allow?: Availability[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  const options = availabilityOptions(type).filter(o => !allow || allow.includes(o));

  // Pending (reserved) and inactive listings aren't managed here, and a single choice isn't a switch
  if (!["ACTIVE", "SOLD", "RENTED"].includes(current) || options.length < 2) return null;

  async function choose(next: Availability) {
    if (next === current || busy) return;
    setBusy(next);
    setError("");
    const res = await fetch(`/api/listings/${id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(data.error || "Couldn't update"); return; }
    setCurrent(next);
    onChanged?.(next);
    router.refresh();
  }

  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]";
  return (
    <div>
      <div role="group" aria-label="Availability" className="inline-flex rounded-lg bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200">
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => choose(o)}
            aria-pressed={current === o}
            disabled={!!busy}
            className={`rounded-md font-semibold transition disabled:cursor-wait ${pad} ${current === o ? ACTIVE_STYLE[o] : "text-slate-500 hover:text-slate-900"} ${busy === o ? "animate-pulse" : ""}`}
          >
            {AVAILABILITY_LABEL[o]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-1 max-w-[260px] text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
