import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { cache } from "react";
import { ArrowLeft, Building2, CalendarCheck, CalendarDays, CarFront, ChevronRight, Clock3, MapPin, MessageSquare, Phone, Tag } from "lucide-react";
import ImageGallery from "@/components/ui/ImageGallery";
import StarRating from "@/components/reviews/StarRating";
import VerifiedBadge from "@/components/VerifiedBadge";
import DealCard, { endsText } from "@/components/deals/DealCard";
import Footer from "@/components/Footer";
import { formatLakh } from "@/lib/format";
import { DEAL_STATE_STYLE, dealLabel, dealPrice, dealState, isRentDeal } from "@/lib/deals";
import { conditionLabel } from "@/lib/vehicleOptions";
import { mapsUrl } from "@/lib/address";
import { getDealPage, getLiveDeals } from "@/lib/publicDeals";
import { SITE_URL } from "@/lib/site";
import BuyRequestButton from "@/components/purchases/BuyRequestButton";
import ShareButton from "@/components/ShareButton";
import ReportButton from "@/components/reports/ReportButton";

// Same for every visitor, so the page itself is cached too; deal changes clear it straight away
export const revalidate = 60;
// No pages are built ahead: each one is built on its first visit and then cached (without this, a [param] route renders on every request)
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

const getPage = cache(getDealPage);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage((await params).id);
  if (!page) return { title: "Deal not found" };
  const { deal } = page;
  const title = `${dealLabel(deal)}: ${deal.title} — PKR ${formatLakh(dealPrice(deal.price, deal))}${isRentDeal(deal) ? "/day" : ""} in ${deal.location}`;
  const description = (deal.description || `${deal.year} ${deal.make} ${deal.model} offered by ${deal.business.name}.`).replace(/\s+/g, " ").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/deals/${deal._id}` },
    // The preview image is opengraph-image.tsx next to this page
    openGraph: { title, description, url: `/deals/${deal._id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

// The listing page's button styles: one dark main action, quiet outlined ones
const PRIMARY_BTN = "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800";
const OUTLINE_BTN = "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50";

export default async function DealPage({ params }: Props) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();
  const { deal, business, rating } = page;
  const now = new Date().getTime();
  const state = dealState(deal, now);
  const live = state === "LIVE";
  const final = dealPrice(deal.price, deal);
  const saving = deal.price - final;
  const rent = isRentDeal(deal);
  const cars = deal.vehicleCount ?? 1;
  const more = (await getLiveDeals({ orgId: business.id, limit: 5 })).filter(d => d._id !== deal._id).slice(0, 4);

  const specs = [
    { label: "Make", value: deal.make },
    { label: "Model", value: deal.model },
    { label: "Year", value: String(deal.year) },
    { label: "Condition", value: conditionLabel(deal.condition) },
    { label: "Mileage", value: deal.mileage != null ? `${deal.mileage.toLocaleString()} km` : null },
    { label: "Fuel", value: deal.fuelType },
    { label: "Transmission", value: deal.transmission },
    { label: "Colour", value: deal.color },
    { label: "City", value: deal.location },
    { label: "Deal type", value: rent ? "Rental package" : "For sale" },
    { label: "Cars in package", value: cars > 1 ? String(cars) : null },
    { label: "Security deposit", value: rent && deal.deposit ? `PKR ${deal.deposit.toLocaleString("en-PK")}` : null },
  ].filter((s): s is { label: string; value: string } => !!s.value);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: deal.title,
    description: deal.description,
    brand: { "@type": "Brand", name: deal.make },
    model: deal.model,
    vehicleModelDate: String(deal.year),
    image: deal.images,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/deals/${deal._id}`,
      price: final,
      priceCurrency: "PKR",
      priceValidUntil: deal.endsAt.slice(0, 10),
      availability: live ? "https://schema.org/InStock" : "https://schema.org/Discontinued",
      seller: { "@type": "AutoDealer", name: business.name },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Link href="/deals" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft size={15} /> All deals
        </Link>

        {!live && (
          <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ring-1 ring-inset" style={{ background: DEAL_STATE_STYLE[state].bg, color: DEAL_STATE_STYLE[state].color }}>
            <Clock3 size={16} />
            {state === "SCHEDULED" ? `This deal starts on ${fmt(deal.startsAt)}.` : state === "EXPIRED" ? `This deal ended on ${fmt(deal.endsAt)}.` : "This deal isn't available at the moment."}
          </div>
        )}

        {/* On phones: photos, then price and contact, then details. On desktop the price column sits on the right. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-x-8">
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <ImageGallery images={deal.images} title={deal.title} />
              <span className="theme-static pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-rose-600/30">
                {dealLabel(deal)}
              </span>
            </div>
          </div>

          {/* Price, contact and business */}
          <div className="space-y-4 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <div className="theme-static relative overflow-hidden bg-gradient-to-br from-rose-600 to-orange-500 p-5 text-white">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{deal.make} · {deal.year}</p>
                <h1 className="relative mt-1 text-xl font-bold leading-snug">{deal.title}</h1>
                <p className="relative mt-3 text-3xl font-extrabold">PKR {formatLakh(final)}{rent && <span className="text-base font-semibold text-white/80"> /day</span>}</p>
                <p className="relative mt-0.5 text-sm text-white/80">
                  <span className="line-through">PKR {formatLakh(deal.price)}</span> · You save PKR {saving.toLocaleString("en-PK")}{rent ? " a day" : ""}
                </p>
                <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  <Clock3 size={12} /> {live ? endsText(deal.endsAt, now) : DEAL_STATE_STYLE[state].label}
                </p>
              </div>
              <div className="space-y-2 p-4">
                <p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={13} /> {fmt(deal.startsAt)} to {fmt(deal.endsAt)}</p>
                {deal.address ? (
                  <a href={mapsUrl(deal.address, deal.location)} target="_blank" rel="noreferrer" className="group flex items-start gap-2 text-xs text-slate-600">
                    <MapPin size={13} className="mt-0.5 flex-shrink-0 text-rose-500" />
                    <span>
                      <span className="font-medium text-slate-900">{deal.address}</span>, {deal.location}
                      <span className="ml-1 font-semibold text-indigo-600 group-hover:underline">Open in Maps</span>
                    </span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={13} /> {deal.location}</p>
                )}
                {rent && cars > 1 && (
                  <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
                    <CarFront size={14} /> Package of {cars} cars, booked together
                  </p>
                )}
                {/* Like the listing page: one dark main action, quiet outlined Call and Message beside each other,
                    and Share and Report as small links */}
                <div className="space-y-2 pt-2">
                  {rent && live && (
                    <Link href={`/deals/${deal._id}/book`} className={PRIMARY_BTN}>
                      <CalendarCheck size={16} /> Book this deal
                    </Link>
                  )}
                  {!rent && live && (
                    <BuyRequestButton dealId={String(deal._id)} title={deal.title} price={final} businessName={business.name}
                      className="!py-2.5 !font-semibold" />
                  )}
                  <div className={`grid gap-2 ${business.phone ? "grid-cols-2" : "grid-cols-1"}`}>
                    {business.phone && (
                      <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className={OUTLINE_BTN} title={business.phone}>
                        <Phone size={16} className="text-slate-500" /> Call
                      </a>
                    )}
                    <Link href={`/messages?with=${business.ownerId}`} className={OUTLINE_BTN}>
                      <MessageSquare size={16} className="text-slate-500" /> Message
                    </Link>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <ShareButton path={`/deals/${deal._id}`} title={deal.title} label="Share this deal" />
                  <ReportButton targetType="DEAL" targetId={String(deal._id)} label={deal.title} />
                </div>
              </div>
            </div>

            <Link href={`/dealers/${business.slug}`} className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition hover:ring-slate-300">
              <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                {business.logo ? <Image src={business.logo} alt="" fill sizes="48px" className="object-cover" /> : business.name[0]?.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-900">{business.name}</span>
                  {business.verified && <VerifiedBadge variant="icon" />}
                </span>
                {rating.count > 0 ? (
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <StarRating value={rating.average} size={12} /> {rating.average.toFixed(1)} ({rating.count})
                  </span>
                ) : (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Building2 size={11} /> {business.city || "Business"}</span>
                )}
              </span>
              <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
            </Link>

            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-200">
              <Tag size={14} className="mt-0.5 flex-shrink-0" />
              See the vehicle and its documents in person before paying anything. AutoGO never asks for advance payments.
            </p>
          </div>
          <div className="lg:col-span-2 lg:col-start-1">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80">
              <h2 className="text-sm font-semibold text-slate-700">Vehicle details</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <dt className="text-[11px] text-slate-400">{s.label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
              {deal.description && (
                <>
                  <h2 className="mt-6 text-sm font-semibold text-slate-700">About this deal</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{deal.description}</p>
                </>
              )}
            </div>
          </div>

        </div>

        {more.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-slate-900">More deals from {business.name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {more.map(d => <DealCard key={d._id} deal={d} now={now} showBusiness={false} />)}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
