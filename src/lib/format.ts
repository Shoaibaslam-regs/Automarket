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
