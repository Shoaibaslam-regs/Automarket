// Client-safe Pakistani mobile number helpers for phone verification.

/**
 * "0300 1234567", "+92 300-1234567", "923001234567" → "+923001234567". Null unless it's a Pakistani mobile
 * (03xx, ten digits after the 0).
 */
export function normalizePkMobile(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(4);
  else if (d.startsWith("92")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^3\d{9}$/.test(d) ? `+92${d}` : null;
}

/** "+923001234567" → "0300 1234567" */
export function formatPkMobile(e164?: string | null): string {
  if (!e164) return "";
  const d = e164.replace(/^\+92/, "0");
  return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}

/**
 * A wa.me chat link. Pakistani numbers in any form ("0300…", "+92 300…") get the 92 country code WhatsApp needs;
 * other numbers keep their digits. Null when there is no number.
 */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = normalizePkMobile(phone)?.slice(1) ?? phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
