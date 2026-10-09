/** Fields a business user may set on a customer; organizationId and the rest are server-controlled. */
export const CUSTOMER_FIELDS = ["name", "phone", "email", "city", "notes", "source", "status"] as const;

/** Customers in these statuses have a closed deal, so the owner may delete them. */
export const CLOSED_CUSTOMER_STATUSES = ["SOLD", "LOST"] as const;

export function isClosedDeal(status: unknown): boolean {
  return (CLOSED_CUSTOMER_STATUSES as readonly unknown[]).includes(status);
}

export function pickCustomerFields(body: unknown) {
  const out: Record<string, string> = {};
  if (!body || typeof body !== "object") return out;
  for (const key of CUSTOMER_FIELDS) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === "string") out[key] = value.trim();
  }
  return out;
}
