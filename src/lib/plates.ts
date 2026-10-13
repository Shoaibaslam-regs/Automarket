// Client-safe helpers for the handover details recorded on a booking:
// the vehicle's number plate (e.g. "LEA-1234") and the renter's CNIC (e.g. "35202-1234567-1").

/** Uppercases and tidies a plate; null if it isn't a plausible registration number. */
export function normalizePlate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plate = value.toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
  return /^[A-Z0-9][A-Z0-9 -]{1,14}$/.test(plate) && /\d/.test(plate) ? plate : null;
}

/** Formats a CNIC as 12345-1234567-1 from any spacing or dashes; null unless it has exactly 13 digits. */
export function normalizeCnic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 13 ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}` : null;
}

/** Inserts the dashes while someone types a CNIC. */
export function formatCnicInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 13);
  return d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** The renter's CNIC on a booking: entered at handover, or given when a walk-in was booked. */
export function bookingCnic(b: { renterCnic?: string | null; walkIn?: { cnic?: string | null } | null }): string | undefined {
  return b.renterCnic || b.walkIn?.cnic || undefined;
}
