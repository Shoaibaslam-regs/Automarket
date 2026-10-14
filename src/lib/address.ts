// Client-safe helpers for the shop / pickup address on listings, deals and bookings.

export const MAX_ADDRESS = 200;

/** Trimmed address with spaces tidied, or "" when nothing usable was given. */
export function cleanAddress(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_ADDRESS) : "";
}

/** Google Maps search link for an address, with the city added when the address doesn't mention it. */
export function mapsUrl(address: string, city?: string | null): string {
  const query = city && !address.toLowerCase().includes(city.toLowerCase()) ? `${address}, ${city}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query}, Pakistan`)}`;
}
