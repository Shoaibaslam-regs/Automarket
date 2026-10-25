// Client-safe: the AutoGO account people pay into for plans, the Verified badge and sponsored ads.
// Admins set it on the admin Overview (stored as the "payment" SiteSetting); /api/payment-details reads it.

export type PaymentDetails = {
  accountTitle: string;
  bankName: string;
  iban: string;
  accountNumber: string;
  jazzcash: string;
  easypaisa: string;
  /** Extra instructions, e.g. "Send the screenshot in Messages" */
  note: string;
};

export const PAYMENT_FIELDS: { key: keyof PaymentDetails; label: string; placeholder: string; max: number }[] = [
  { key: "accountTitle", label: "Account title", placeholder: "AutoGO Pvt Ltd", max: 100 },
  { key: "bankName", label: "Bank", placeholder: "Meezan Bank", max: 100 },
  { key: "iban", label: "IBAN", placeholder: "PK36MEZN0000000000000000", max: 40 },
  { key: "accountNumber", label: "Account number", placeholder: "0123456789", max: 40 },
  { key: "jazzcash", label: "JazzCash", placeholder: "0300 1234567", max: 20 },
  { key: "easypaisa", label: "EasyPaisa", placeholder: "0345 1234567", max: 20 },
  { key: "note", label: "Note for payers", placeholder: "After paying, send the transaction ID in Messages", max: 300 },
];

/** Trims and limits each field; returns null when nothing is filled in. */
export function cleanPaymentDetails(input: unknown): PaymentDetails | null {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as PaymentDetails;
  for (const f of PAYMENT_FIELDS) {
    const v = src[f.key];
    out[f.key] = typeof v === "string" ? v.trim().slice(0, f.max) : "";
  }
  if (out.iban) out.iban = out.iban.replace(/\s+/g, "").toUpperCase();
  return PAYMENT_FIELDS.some(f => f.key !== "note" && out[f.key]) ? out : null;
}
