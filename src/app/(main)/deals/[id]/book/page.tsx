import { whatsappUrl } from "@/lib/phone";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CarFront, ChevronLeft, ImageOff, MapPin, Phone, Tag } from "lucide-react";
import { auth } from "@/lib/auth";
import BookingForm from "@/components/rentals/BookingForm";
import { getDealPage } from "@/lib/publicDeals";
import { dealLabel, dealPrice, dealState, isRentDeal } from "@/lib/deals";
import { mapsUrl } from "@/lib/address";
import { loginFor } from "@/lib/callbackPath";
import { pickedDay } from "@/lib/bookings";

/** Booking page for a rent deal: same date picker and flow as renting a listed vehicle. */
export default async function BookDealPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  /** `start`: the pick-up day tapped on the deal's calendar */
  searchParams: Promise<{ start?: string | string[] }>;
}) {
  const { id } = await params;
  const start = pickedDay((await searchParams).start);
  const session = await auth();
  // Signing in brings them back here with the day still picked
  if (!session?.user) redirect(loginFor(`/deals/${id}/book${start ? `?start=${start}` : ""}`));

  const page = await getDealPage(id);
  if (!page || !isRentDeal(page.deal)) notFound();
  const { deal, business } = page;
  if (dealState(deal) !== "LIVE") redirect(`/deals/${id}`);

  const daily = dealPrice(deal.price, deal);
  const cars = deal.vehicleCount ?? 1;
  // The business's number, so the renter can ask before booking
  const wa = whatsappUrl(business.phone, `Hi, I'd like to book your deal: ${deal.title}`);
  const tel = business.phone?.replace(/[^\d+]/g, "") || null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1000px]">
        <Link href={`/deals/${id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900">
          <ChevronLeft size={15} strokeWidth={2} /> Back to deal
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Book this deal</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500 sm:mb-8">Choose your dates. {business.name} confirms the booking, then hands over the {cars > 1 ? "cars" : "vehicle"}.</p>

        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex gap-3 p-3 lg:block lg:p-0">
                <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:aspect-[16/10] lg:h-auto lg:w-full lg:rounded-none">
                  {deal.images[0] ? (
                    <Image src={deal.images[0]} alt={deal.title} fill priority sizes="(max-width: 1024px) 96px, 340px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400"><ImageOff size={20} strokeWidth={1.5} /></div>
                  )}
                  <span className="theme-static absolute left-2 top-2 hidden rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[11px] font-extrabold uppercase text-white lg:inline-block">
                    {dealLabel(deal)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 lg:p-5 lg:pb-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-600"><Tag size={11} /> Deal · {business.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{deal.title}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin size={12} strokeWidth={1.75} className="flex-shrink-0" />{deal.location}
                    {cars > 1 && <><span className="mx-1">·</span><CarFront size={12} /> {cars} cars</>}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 border-t border-slate-100 px-4 py-4 text-[13px] lg:mx-5 lg:mt-4 lg:px-0 lg:pb-5">
                {deal.address && (
                  <div className="flex justify-between gap-3">
                    <span className="flex-shrink-0 text-slate-500">Pickup address</span>
                    <a href={mapsUrl(deal.address, deal.location)} target="_blank" rel="noreferrer" className="text-right font-semibold text-slate-900 hover:underline">{deal.address}</a>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Deal price per day</span>
                  <span className="font-semibold text-rose-600">PKR {daily.toLocaleString("en-PK")} <span className="text-xs font-normal text-slate-400 line-through">{deal.price.toLocaleString("en-PK")}</span></span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Security deposit</span>
                  <span className="font-semibold text-slate-900">PKR {(deal.deposit ?? 0).toLocaleString("en-PK")}</span>
                </div>
              </div>
              {/* Ask the business before booking: WhatsApp and Call */}
              {(wa || tel) && (
                <div className="border-t border-slate-100 px-4 py-3.5 lg:mx-5 lg:px-0 lg:pb-5">
                  <p className="mb-2 text-xs text-slate-500">Questions before booking?</p>
                  <div className={`grid gap-2 ${wa && tel ? "grid-cols-2" : "grid-cols-1"}`}>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
                        <WhatsAppIcon size={16} className="text-emerald-600" /> WhatsApp
                      </a>
                    )}
                    {tel && (
                      <a href={`tel:${tel}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
                        <Phone size={15} className="text-slate-500" /> Call
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 lg:order-1">
            <BookingForm
              dealId={id}
              dailyRate={daily}
              deposit={deal.deposit ?? 0}
              availableFrom={deal.startsAt}
              availableTo={deal.endsAt}
              initialStart={start}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
