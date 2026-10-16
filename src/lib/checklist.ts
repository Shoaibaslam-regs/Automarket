// Client-safe handover/return checklist and deposit helpers for bookings.
import { isUploadedImageUrl } from "@/lib/uploadUrls";

export const FUEL_LEVELS = ["E", "1/4", "1/2", "3/4", "F"] as const;
export type FuelLevel = (typeof FUEL_LEVELS)[number];
export const FUEL_LABEL: Record<FuelLevel, string> = { E: "Empty", "1/4": "¼", "1/2": "½", "3/4": "¾", F: "Full" };
export const MAX_CHECK_PHOTOS = 6;

/** The vehicle's condition when it goes out (handover) or comes back (return). */
export type Check = { odometer?: number; fuel?: FuelLevel; notes?: string; photos?: string[] };

/** Validates a checklist from a request body. Everything is optional; returns an error message for bad values. */
export function parseCheck(input: unknown): { check?: Check; error?: string } {
  if (input == null || typeof input !== "object") return {};
  const i = input as Record<string, unknown>;
  const check: Check = {};
  if (i.odometer !== undefined && i.odometer !== null && i.odometer !== "") {
    const km = Math.round(Number(i.odometer));
    if (!Number.isFinite(km) || km < 0 || km > 5_000_000) return { error: "Enter the odometer reading in km" };
    check.odometer = km;
  }
  if (i.fuel) {
    if (!FUEL_LEVELS.includes(i.fuel as FuelLevel)) return { error: "Choose the fuel level" };
    check.fuel = i.fuel as FuelLevel;
  }
  if (typeof i.notes === "string" && i.notes.trim()) check.notes = i.notes.trim().slice(0, 500);
  if (Array.isArray(i.photos)) {
    const photos = i.photos.filter(isUploadedImageUrl);
    if (photos.length !== i.photos.length) return { error: "A photo wasn't uploaded properly. Please try again." };
    if (photos.length > MAX_CHECK_PHOTOS) return { error: `Add up to ${MAX_CHECK_PHOTOS} photos` };
    if (photos.length) check.photos = photos;
  }
  return Object.keys(check).length ? { check } : {};
}

/** Kilometres driven between handover and return, when both readings exist. */
export function kmDriven(b: { checkOut?: Check | null; checkIn?: Check | null }): number | null {
  const a = b.checkOut?.odometer, z = b.checkIn?.odometer;
  return a != null && z != null && z >= a ? z - a : null;
}

export type DepositStatus = "NONE" | "HELD" | "REFUNDED" | "PART_KEPT" | "KEPT";

export const DEPOSIT_LABEL: Record<DepositStatus, string> = {
  NONE: "No deposit",
  HELD: "Deposit held",
  REFUNDED: "Deposit refunded",
  PART_KEPT: "Deposit partly kept",
  KEPT: "Deposit kept",
};

type DepositBooking = { deposit: number; depositRefunded?: number; depositSettledAt?: Date | string | null };

/** Where the security deposit stands: held until the owner settles it after the return. */
export function depositState(b: DepositBooking): { status: DepositStatus; refunded: number; kept: number } {
  if (!b.deposit) return { status: "NONE", refunded: 0, kept: 0 };
  if (!b.depositSettledAt) return { status: "HELD", refunded: 0, kept: 0 };
  const refunded = Math.min(b.deposit, Math.max(0, b.depositRefunded ?? 0));
  const kept = b.deposit - refunded;
  return { status: kept === 0 ? "REFUNDED" : refunded === 0 ? "KEPT" : "PART_KEPT", refunded, kept };
}
