import Link from "next/link";
import { CalendarCheck, MessageCircle, MessageSquare, Phone } from "lucide-react";

/**
 * Phones and tablets: the listing's price and the ways to reach the seller, fixed to the bottom of the screen so
 * contact is always one tap away. Hidden on desktop, where the seller box sits beside the photos. While it shows it
 * sets --am-bottom-bar, which the compare bar and install banner use to sit above it.
 */
export default function ContactBar({ price, perDay, phone, whatsapp, messageHref, bookHref }: {
  /** Already formatted, e.g. "PKR 26 lakh" */
  price: string;
  perDay?: boolean;
  phone?: string;
  whatsapp?: string | null;
  /** Signed-in visitors can message the seller in the app */
  messageHref?: string;
  /** Rentals: the online booking page (or sign in) */
  bookHref?: string;
}) {
  const btn = "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition";
  // The first available action is the main one; the rest are compact icon buttons
  const actions = [
    bookHref && { key: "book", href: bookHref, label: "Book", icon: CalendarCheck, tone: "bg-slate-900 text-white hover:bg-slate-800" },
    phone && { key: "call", href: `tel:${phone}`, label: "Call", icon: Phone, tone: "bg-slate-900 text-white hover:bg-slate-800" },
    whatsapp && { key: "wa", href: whatsapp, label: "WhatsApp", icon: MessageCircle, tone: "bg-emerald-600 text-white hover:bg-emerald-700", external: true },
    messageHref && { key: "msg", href: messageHref, label: "Message", icon: MessageSquare, tone: "text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50" },
  ].filter(Boolean).slice(0, 3) as { key: string; href: string; label: string; icon: typeof Phone; tone: string; external?: boolean }[];
  if (!actions.length) return null;
  const [main, ...rest] = actions;
  const MainIcon = main.icon;

  return (
    <>
      <style>{`@media (max-width: 1023px) { :root { --am-bottom-bar: 68px; } }`}</style>
      <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-slate-900">{price}{perDay && <span className="text-xs font-medium text-slate-500"> /day</span>}</p>
            <p className="text-[11px] text-slate-500">Contact the seller</p>
          </div>
          {rest.map(a => {
            const Icon = a.icon;
            return (
              <a key={a.key} href={a.href} aria-label={a.label} {...(a.external && { target: "_blank", rel: "noreferrer" })} className={`${btn} w-11 flex-shrink-0 ${a.tone}`}>
                <Icon size={18} />
              </a>
            );
          })}
          {main.external ? (
            <a href={main.href} target="_blank" rel="noreferrer" className={`${btn} flex-shrink-0 px-5 ${main.tone}`}><MainIcon size={16} /> {main.label}</a>
          ) : main.href.startsWith("/") ? (
            <Link href={main.href} className={`${btn} flex-shrink-0 px-5 ${main.tone}`}><MainIcon size={16} /> {main.label}</Link>
          ) : (
            <a href={main.href} className={`${btn} flex-shrink-0 px-5 ${main.tone}`}><MainIcon size={16} /> {main.label}</a>
          )}
        </div>
      </div>
    </>
  );
}
