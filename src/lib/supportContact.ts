// Client-safe support contact helpers. The WhatsApp number comes from NEXT_PUBLIC_SUPPORT_WHATSAPP
// (international format, e.g. 923001234567); without it the WhatsApp button is hidden.

export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

/** The message a user sends when asking for a plan, including their short ID so admins can find them. */
export function upgradeRequestText(planName: string, price: number, user?: { id?: string; email?: string | null }) {
  const who = user?.id ? ` My AutoMarket ID is #${user.id.slice(-6)}${user.email ? ` (${user.email})` : ""}.` : "";
  return `Hi AutoMarket team, I'd like to upgrade to the ${planName} plan (PKR ${price.toLocaleString()}/month).${who} How can I pay?`;
}

export function whatsappLink(text: string): string | null {
  return SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}
