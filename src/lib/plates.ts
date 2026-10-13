// Client-safe number plate helpers, e.g. "LEA-1234" or "ABC 123".

/** Uppercases and tidies a plate; null if it isn't a plausible registration number. */
export function normalizePlate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plate = value.toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
  return /^[A-Z0-9][A-Z0-9 -]{1,14}$/.test(plate) && /\d/.test(plate) ? plate : null;
}
