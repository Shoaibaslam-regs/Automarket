"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Fuel, Gauge, X } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing-client";
import { FUEL_LABEL, FUEL_LEVELS, MAX_CHECK_PHOTOS, type Check, type FuelLevel } from "@/lib/checklist";
import Tip from "@/components/ui/Tip";

export type CheckForm = { odometer: string; fuel: FuelLevel | ""; notes: string; photos: string[] };
export const EMPTY_CHECK: CheckForm = { odometer: "", fuel: "", notes: "", photos: [] };

/** The form values as the API expects them (empty fields left out). */
export function checkBody(f: CheckForm): Check | undefined {
  const c: Check = {};
  if (f.odometer.trim()) c.odometer = Number(f.odometer);
  if (f.fuel) c.fuel = f.fuel;
  if (f.notes.trim()) c.notes = f.notes.trim();
  if (f.photos.length) c.photos = f.photos;
  return Object.keys(c).length ? c : undefined;
}

/**
 * Vehicle condition at handover or return: odometer, fuel level, notes and up to six photos
 * (scratches, dents, the fuel gauge). All optional, but they settle arguments about damage and fuel later.
 */
export default function ConditionFields({ value, onChange, minKm, idPrefix }: {
  value: CheckForm;
  onChange: (v: CheckForm) => void;
  /** Odometer at handover, shown as a hint on return */
  minKm?: number;
  idPrefix: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (p: Partial<CheckForm>) => onChange({ ...value, ...p });
  const km = Number(value.odometer);
  const driven = minKm != null && value.odometer.trim() && km >= minKm ? km - minKm : null;

  return (
    <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vehicle condition (optional) <Tip id="condition" size={12} /></p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${idPrefix}-km`} className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-900"><Gauge size={12} /> Odometer (km)</label>
          <input id={`${idPrefix}-km`} type="number" min={minKm ?? 0} inputMode="numeric" value={value.odometer} onChange={e => set({ odometer: e.target.value })}
            placeholder={minKm != null ? `Out: ${minKm.toLocaleString()}` : "e.g. 45200"}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900" />
          {driven != null && <p className="mt-1 text-[11px] font-semibold text-indigo-600">{driven.toLocaleString()} km driven</p>}
          {minKm != null && value.odometer.trim() && km < minKm && <p className="mt-1 text-[11px] text-rose-600">Lower than at handover</p>}
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-900"><Fuel size={12} /> Fuel</p>
          <div role="radiogroup" aria-label="Fuel level" className="grid h-10 grid-cols-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {FUEL_LEVELS.map(l => (
              <button key={l} type="button" role="radio" aria-checked={value.fuel === l} aria-label={FUEL_LABEL[l]} onClick={() => set({ fuel: value.fuel === l ? "" : l })}
                className={`text-[11px] font-bold transition ${value.fuel === l ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                {l === "E" || l === "F" ? l : FUEL_LABEL[l]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <input value={value.notes} onChange={e => set({ notes: e.target.value })} maxLength={500} aria-label="Condition notes"
        placeholder="Notes, e.g. small scratch on rear bumper"
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900" />
      <div className="flex flex-wrap items-center gap-2">
        {value.photos.map(url => (
          <span key={url} className="relative h-12 w-12 overflow-hidden rounded-lg ring-1 ring-slate-200">
            <Image src={url} alt="" fill sizes="48px" className="object-cover" />
            <button type="button" onClick={() => set({ photos: value.photos.filter(p => p !== url) })} aria-label="Remove photo"
              className="absolute right-0 top-0 rounded-bl-md bg-black/60 p-0.5 text-white"><X size={10} /></button>
          </span>
        ))}
        {value.photos.length < MAX_CHECK_PHOTOS && (
          <UploadButton
            endpoint="checkPhotos"
            onUploadBegin={() => { setUploading(true); setError(""); }}
            onClientUploadComplete={res => {
              setUploading(false);
              const urls = res.map(r => r.ufsUrl || r.url).filter(Boolean);
              onChange({ ...value, photos: [...value.photos, ...urls].slice(0, MAX_CHECK_PHOTOS) });
            }}
            onUploadError={err => { setUploading(false); setError(err.message); }}
            appearance={{
              button: "!h-12 !w-auto !rounded-lg !bg-white !px-3 !text-xs !font-semibold !text-slate-700 !ring-1 !ring-inset !ring-slate-200 hover:!bg-slate-100 ut-uploading:opacity-70",
              container: "items-start",
              allowedContent: "hidden",
            }}
            content={{ button: () => <span className="inline-flex items-center gap-1.5"><Camera size={14} /> {uploading ? "Uploading…" : "Photos"}</span> }}
          />
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

/** One line summary of a recorded condition, for cards: "45,200 km · Fuel ½ · 3 photos". */
export function conditionText(c?: Check | null): string {
  if (!c) return "";
  return [c.odometer != null && `${c.odometer.toLocaleString()} km`, c.fuel && `Fuel ${FUEL_LABEL[c.fuel]}`, c.photos?.length && `${c.photos.length} photo${c.photos.length !== 1 ? "s" : ""}`]
    .filter(Boolean).join(" · ");
}
