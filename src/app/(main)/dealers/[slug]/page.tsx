import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import ContactBar from "@/components/listings/ContactBar";
import { mapsUrl } from "@/lib/address";
import { whatsappUrl } from "@/lib/phone";
import { ShopNotice as ShopNoticeModel } from "@/models/ShopNotice";
import { ShopNoticeList } from "@/components/business/ShopNoticeCard";
import { noticesToShow, type ShopNotice } from "@/lib/shopNotices";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_SECONDS, businessTag } from "@/lib/pageCache";
import type { Metadata } from "next";
import mongoose from "mongoose";
import { CalendarDays, Car, KeyRound, Mail, MapPin, Phone, Star, Tag } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Listing, type IListing } from "@/models/Listing";
import { BusinessReview } from "@/models/BusinessReview";
import { getOrgUserIds } from "@/lib/business";
import { getLiveDeals } from "@/lib/publicDeals";
import { publicStatusQuery } from "@/lib/listingFilters";
import DealCard from "@/components/deals/DealCard";
import { isVerified, type BadgeVerification } from "@/lib/plans";
import VerifiedBadge from "@/components/VerifiedBadge";
import FollowShopButton from "@/components/business/FollowShopButton";
import DealerVehicles from "@/components/listings/DealerVehicles";
import StarRating from "@/components/reviews/StarRating";
import { DealerReportButton, DealerReviews, DealerViewerProvider } from "@/components/reviews/DealerViewer";
import { toReviewView } from "@/components/reviews/types";
import ShareButton from "@/components/ShareButton";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";

type Props = { params: Promise<{ slug: string }> };

// The same for every visitor (your own review and the team check load in the browser, DealerViewer), so the CDN
// serves it and rebuilds it at most once a minute; changes clear it straight away through businessTag
export const revalidate = 60;
// No pages are built ahead: each one is built on its first visit and then cached (without this, a [param] route renders on every request)
export function generateStaticParams() {
  return [];
}
type Org = {
  _id: mongoose.Types.ObjectId; name: string; slug: string; type: "DEALER" | "RENTAL" | "BOTH";
  city?: string; address?: string; phone?: string; email?: string; description?: string; createdAt: Date;
  verification?: BadgeVerification;
  logo?: string;
};

const REVIEW_PAGE = 10;
const TYPE_LABEL: Record<Org["type"], string> = { DEALER: "Car dealer", RENTAL: "Rental company", BOTH: "Dealer & rentals" };


/**
 * The parts of the page that are the same for every visitor, cached for PUBLIC_CACHE_SECONDS and cleared when
 * the business, its listings or reviews change (deals are loaded and cached separately). Cached values are plain JSON: ids and dates are strings.
 */
const loadBusinessPage = (slug: string) =>
  unstable_cache(
    async () => {
      await connectDB();
      const org = await Organization.findOne({ slug, isActive: { $ne: false } })
        .select("name slug type city logo address phone email description createdAt verification.verifiedAt verification.expiresAt")
        .lean<Org>();
      if (!org) return null;
      const memberIds = await getOrgUserIds(org._id);
      const [listings, ratingRows, firstReviews, notices] = await Promise.all([
        // Recently sold or rented vehicles stay on show (stamped) after the available ones
        // Pinned vehicles first (Premium Plus and up, newest pin first), then available before sold and rented
        Listing.find({ sellerId: { $in: memberIds }, ...publicStatusQuery() }).sort({ pinnedAt: -1, status: 1, createdAt: -1 }).limit(24).populate(CARD_SELLER_POPULATE).lean(),
        BusinessReview.aggregate<{ _id: number; count: number }>([
          { $match: { organizationId: org._id } },
          { $group: { _id: "$rating", count: { $sum: 1 } } },
        ]),
        BusinessReview.find({ organizationId: org._id }).sort({ createdAt: -1 }).limit(REVIEW_PAGE).populate("reviewerId", "name image").lean(),
        // The shop's own announcements; the page picks the ones still live when it renders (noticesToShow)
        ShopNoticeModel.find({ organizationId: org._id, endsAt: { $gt: new Date() } }).sort({ pinned: -1, createdAt: -1 }).limit(10)
          .select("kind title body eventAt endsAt link linkLabel pinned createdAt").lean(),
      ]);
      return JSON.parse(JSON.stringify({ org, memberIds, listings, ratingRows, firstReviews, notices }));
    },
    ["business-page", slug],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [businessTag(slug)] }
  )() as Promise<{
    org: Org;
    memberIds: string[];
    listings: Array<IListing & { _id: string }>;
    ratingRows: Array<{ _id: number; count: number }>;
    firstReviews: Parameters<typeof toReviewView>[0][];
    notices: ShopNotice[];
  } | null>;

// Shared by generateMetadata and the page, so the data is only read once per request
const getBusinessPage = cache(loadBusinessPage);
const getBusiness = async (slug: string) => (await getBusinessPage(slug))?.org ?? null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getBusiness(slug);
  if (!org) return { title: "Business not found" };
  return {
    title: `${org.name}${org.city ? ` · ${org.city}` : ""}`,
    description: org.description || `${TYPE_LABEL[org.type]} on AutoGO. See vehicles, deals and customer reviews.`,
  };
}

export default async function DealerPage({ params }: Props) {
  const { slug } = await params;
  const page = await getBusinessPage(slug);
  if (!page) notFound();
  const { org, listings, ratingRows, firstReviews } = page;
  const deals = await getLiveDeals({ orgId: String(org._id), limit: 12 });
  const now = new Date();
  const nowMs = now.getTime();
  // Announcements the business posted (Business → Announcements), pinned first
  const notices = noticesToShow(page.notices ?? [], now);

  const distribution = [0, 0, 0, 0, 0, 0];
  for (const r of ratingRows) distribution[r._id] = r.count;
  const count = distribution.reduce((a, b) => a + b, 0);
  const average = count ? Math.round((distribution.reduce((sum, c, star) => sum + c * star, 0) / count) * 10) / 10 : 0;

  const available = listings.filter(l => l.status === "ACTIVE");
  const forSale = available.filter(l => l.type !== "RENT").length;
  const forRent = available.filter(l => l.type !== "SALE").length;
  const since = new Date(org.createdAt).getFullYear();

  return (
    <DealerViewerProvider slug={org.slug}>
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="relative mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
          {/* Three groups with room between them: who (logo, name, type · city), standing (rating, since) and what to
              do (Follow, Share; full width on phones, on the right from sm). One subtitle line, three weights. */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            {/* A grid, so the rating line runs full width under the logo on phones and sits under the name from sm */}
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:items-start sm:gap-x-5">
                {org.logo ? (
                  <span className="relative block h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/15 sm:row-span-2 sm:h-20 sm:w-20">
                    <Image src={org.logo} alt={org.name} fill sizes="80px" className="object-cover" priority />
                  </span>
                ) : (
                  <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl font-bold text-slate-950 sm:row-span-2 sm:h-20 sm:w-20 sm:text-3xl">
                    {org.name[0]?.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="break-words text-[26px] font-bold leading-[1.15] tracking-tight sm:text-3xl">
                    {isVerified(org.verification) ? <NameWithTick name={org.name} /> : org.name}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400">
                    {TYPE_LABEL[org.type]}{org.city ? <><span aria-hidden className="mx-1.5 text-slate-600">·</span>{org.city}</> : null}
                  </p>
                </div>

              <div className="col-span-2 mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400 sm:col-span-1 sm:col-start-2 sm:mt-3">
                <a href="#reviews" className="inline-flex items-center gap-2 transition hover:text-white">
                  <StarRating value={average} size={14} />
                  <span className="font-semibold text-white">{count ? average.toFixed(1) : "New"}</span>
                  <span className="underline-offset-2 hover:underline">{count} review{count !== 1 ? "s" : ""}</span>
                </a>
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> On AutoGO since {since}</span>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2.5">
              <FollowShopButton slug={org.slug} name={org.name} className="flex-1 sm:flex-none" />
              <ShareButton variant="dark" path={`/dealers/${org.slug}`} title={org.name} menuAlign="right"
                className="min-h-10 !rounded-lg !px-4 !text-sm !text-white !ring-white/20" />
            </div>
          </div>

          {/* What the shop has, as one strip with dividers; Report sits quietly at the end of the hero */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <dl className="grid w-full max-w-lg grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
              {[
                { label: "For sale", value: forSale, icon: Car },
                { label: "For rent", value: forRent, icon: KeyRound },
                { label: "Live deals", value: deals.length, icon: Tag },
              ].map(s => (
                <div key={s.label} className="px-4 py-3.5">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-400"><s.icon size={13} /> {s.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            <span className="self-start sm:self-auto">
              <DealerReportButton targetType="BUSINESS" targetId={String(org._id)} label={org.name} tone="dark" />
            </span>
          </div>
        </div>
      </section>

      {notices.length > 0 && (
        <div className="mx-auto max-w-[1120px] px-4 pt-6 sm:px-6 sm:pt-8">
          <ShopNoticeList notices={notices} businessName={org.name} now={now} />
        </div>
      )}

      <div className="mx-auto grid max-w-[1120px] gap-6 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-8">
        <div className="min-w-0 space-y-6">
          {/* Deals */}
          {deals.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><Tag size={18} className="text-rose-600" /> Current deals</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {deals.map(d => <DealCard key={d._id} deal={d} now={nowMs} showBusiness={false} />)}
              </div>
            </section>
          )}

          {/* Vehicles: plain JSON for the client component (ObjectIds and Dates don't cross the boundary) */}
          <DealerVehicles
            businessName={org.name}
            listings={listings}
          />

          <DealerReviews
            slug={org.slug}
            businessName={org.name}
            initialReviews={firstReviews.map(toReviewView)}
            initialSummary={{ average, count }}
            initialHasMore={count > REVIEW_PAGE}
            distribution={distribution}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ContactCard org={org} />
          {org.description && (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80">
              <h2 className="text-sm font-semibold text-slate-900">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{org.description}</p>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            <Star size={16} className="mt-0.5 flex-shrink-0 text-amber-500" fill="currentColor" />
            <p>Reviews come only from people this business has rented to, sold to or agreed a deal with. <Link href="#reviews" className="font-semibold underline">Read them</Link>.</p>
          </div>
        </aside>
      </div>

      {/* Phones and tablets: Call, WhatsApp and the shop on Google Maps, always one tap away at the bottom */}
      <ContactBar
        price={org.name}
        note={org.city ? `${TYPE_LABEL[org.type]} · ${org.city}` : TYPE_LABEL[org.type]}
        phone={org.phone || undefined}
        whatsapp={whatsappUrl(org.phone, `Hi ${org.name}, I found you on AutoGO.`)}
        mapHref={org.address || org.city ? mapsUrl(org.address || org.city!, org.city) : null}
        whatsappFirst
      />
    </div>
    </DealerViewerProvider>
  );
}

/** The business's phone, email, address and WhatsApp button, in the right column (below the vehicles and reviews on phones). */
function ContactCard({ org }: { org: Org }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80">
      <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
      <div className="mt-3 space-y-2.5 text-sm">
        {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-2.5 text-slate-700 hover:text-slate-950"><Phone size={15} className="text-slate-400" /> {org.phone}</a>}
        {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-2.5 break-all text-slate-700 hover:text-slate-950"><Mail size={15} className="flex-shrink-0 text-slate-400" /> {org.email}</a>}
        {(org.address || org.city) && (
          <p className="flex items-start gap-2.5 text-slate-700"><MapPin size={15} className="mt-0.5 flex-shrink-0 text-slate-400" /> {[org.address, org.city].filter(Boolean).join(", ")}</p>
        )}
      </div>
      {org.phone && (
        <a
          href={`https://wa.me/${org.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${org.name}, I found you on AutoGO.`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe5b]"
        >
          <WhatsAppIcon size={16} /> WhatsApp {org.name.split(" ")[0]}
        </a>
      )}
    </div>
  );
}

/**
 * The business name with the Verified tick after its last word, kept on the same line as that word (phones only:
 * from `sm` the "Verified" pill sits beside the name instead), so a long name never leaves the tick alone on a line.
 */
function NameWithTick({ name }: { name: string }) {
  const cut = name.trimEnd().lastIndexOf(" ");
  const head = cut > 0 ? name.slice(0, cut + 1) : "";
  const last = cut > 0 ? name.slice(cut + 1).trimEnd() : name.trimEnd();
  return (
    <>
      {head}
      <span className="whitespace-nowrap">
        {last}
        <VerifiedBadge variant="icon" size={20} className="ml-1.5 align-[-3px] sm:ml-2 sm:align-[-2px] sm:[&_svg]:h-6 sm:[&_svg]:w-6" />
      </span>
    </>
  );
}
