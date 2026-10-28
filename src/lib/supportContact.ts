// Client-safe support contact helpers. The WhatsApp number comes from NEXT_PUBLIC_SUPPORT_WHATSAPP
// (international format, e.g. 923001234567); without it the WhatsApp button is hidden.

export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

type Requester = { id?: string; email?: string | null; business?: { id: string; name: string } | null };

/** "Business: "Name" (Business ID #abc123). My ID #def456 (email)." so admins can find both in Plan lookup. */
function whoText(user?: Requester) {
  const business = user?.business ? ` Business: "${user.business.name}" (Business ID #${user.business.id.slice(-6)}).` : "";
  const me = user?.id ? ` My ID is #${user.id.slice(-6)}${user.email ? ` (${user.email})` : ""}.` : "";
  return business + me;
}

// They've already been shown the payment details (the upgrade dialog, Promote, Help & support), so the message
// says they will pay there rather than asking how
const PAY_LINE = " I'll pay to the account shown on AutoGO and send the payment receipt here.";

/** The message a user sends when asking for a plan: the plan, their business and account IDs, and that they'll pay. */
export function upgradeRequestText(planName: string, price: number, user?: Requester) {
  return `Hi AutoGO team, I'd like to upgrade to the ${planName} plan (PKR ${price.toLocaleString()}/month).${whoText(user)}${PAY_LINE}`;
}

/** The message a business owner sends when asking for the Verified badge. */
export function badgeRequestText(businessName: string, price: number, user?: Requester) {
  const name = user?.business ? "" : ` Business: "${businessName}".`;
  return `Hi AutoGO team, I'd like the Verified badge for my business (PKR ${price.toLocaleString()}/month).${name}${whoText(user)}${PAY_LINE}`;
}

export function whatsappLink(text: string): string | null {
  return SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}
