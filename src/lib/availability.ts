// Client-safe: which availability tags a listing can carry, and how they read.

export type Availability = "ACTIVE" | "SOLD" | "RENTED";

/** Tags the owner can choose for a listing of this type. */
export function availabilityOptions(type: string): Availability[] {
  if (type === "SALE") return ["ACTIVE", "SOLD"];
  if (type === "RENT") return ["ACTIVE", "RENTED"];
  return ["ACTIVE", "SOLD", "RENTED"];
}

export const AVAILABILITY_LABEL: Record<Availability, string> = { ACTIVE: "Available", SOLD: "Sold", RENTED: "Rented" };

/** The tag shown to the public on a sold or rented vehicle; null while it is available. */
export function closedTag(status: string): { label: string; tone: "sold" | "rented" } | null {
  if (status === "SOLD") return { label: "Sold out", tone: "sold" };
  if (status === "RENTED") return { label: "Rented", tone: "rented" };
  return null;
}
