const trim = (v: number) => Number(v.toFixed(2)).toLocaleString("en-PK");

/** 4500000 → "45 lakh", 12500000 → "1.25 crore", 85000 → "85,000" — how prices are read in Pakistan. */
export function formatLakh(n: number): string {
  if (n >= 1e7) return `${trim(n / 1e7)} crore`;
  if (n >= 1e5) return `${trim(n / 1e5)} lakh`;
  return n.toLocaleString("en-PK");
}

/** "PKR 45 lakh", with "/day" for rent-only listings (whose price is the daily rate). */
export function formatPrice(price: number, type?: string): string {
  return type === "RENT" ? `PKR ${price.toLocaleString("en-PK")}/day` : `PKR ${formatLakh(price)}`;
}

/**
 * Counts made short for tight spots: 950 → "950", 1250 → "1.2K", 125400 → "125.4K", 2500000 → "2.5M". Rounded
 * down to one decimal, so a total is never shown bigger than it is (999,999 is "999.9K", not "1000K").
 */
export function compactCount(n: number): string {
  const units: [number, string][] = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, unit] of units) {
    // Multiply before dividing, so floating point can never turn 2,900 into "2.8K"
    if (Math.abs(n) >= size) return `${Math.floor((n * 10) / size) / 10}${unit}`;
  }
  return Math.round(n).toLocaleString("en-PK");
}
