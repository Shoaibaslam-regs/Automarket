import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import mongoose from "mongoose";
import { Building2, CalendarDays, Car, KeyRound, Mail, MapPin, Phone, Star, Tag } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { Listing, type IListing } from "@/models/Listing";
import { BusinessReview } from "@/models/BusinessReview";
import { Deal } from "@/models/Deal";
import { getOrgUserIds } from "@/lib/business";
import { canReviewBusiness } from "@/lib/reviews";
import { dealLabel } from "@/lib/deals";
import { isVerified, type BadgeVerification } from "@/lib/plans";
import VerifiedBadge from "@/components/VerifiedBadge";
import DealerVehicles from "@/components/listings/DealerVehicles";
import StarRating from "@/components/reviews/StarRating";
import BusinessReviews, { type ReviewViewer } from "@/components/reviews/BusinessReviews";
import { toReviewView } from "@/components/reviews/types";

type Props = { params: Promise<{ slug: string }> };
type Org = {
  _id: mongoose.Types.ObjectId; name: string; slug: string; type: "DEALER" | "RENTAL" | "BOTH";
  city?: string; address?: string; phone?: string; email?: string; description?: string; createdAt: Date;
  verification?: BadgeVerification;
};

const REVIEW_PAGE = 10;
const TYPE_LABEL: Record<Org["type"], string> = { DEALER: "Car dealer", RENTAL: "Rental company", BOTH: "Dealer & rentals" };

const getBusiness = cache(async (slug: string) => {
  await connectDB();
  return Organization.findOne({ slug, isActive: { $ne: false } })
    .select("name slug type city address phone email description createdAt verification.verifiedAt verification.expiresAt")
    .lean<Org>();
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getBusiness(slug);
  if (!org) return { title: "Business not found" };
  return {
    title: `${org.name}${org.city ? ` · ${org.city}` : ""}`,
    description: org.description || `${TYPE_LABEL[org.type]} on AutoMarket. See vehicles, deals and customer reviews.`,
  };
}

export default async function DealerPage({ params }: Props) {
  const { slug } = await params;
  const org = await getBusiness(slug);
  if (!org) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const memberIds = await getOrgUserIds(org._id);
  const now = new Date();

  const [listings, deals, ratingRows, firstReviews, myReview, eligible] = await Promise.all([
    Listing.find({ sellerId: { $in: memberIds }, status: "ACTIVE" }).sort({ featured: -1, createdAt: -1 }).limit(24).lean<Array<IListing & { _id: mongoose.Types.ObjectId }>>(),
    Deal.find({ organizationId: org._id, paused: false, disabledByAdmin: false, startsAt: { $lte: now }, endsAt: { $gte: now } })
      .sort({ endsAt: 1 })
      .populate("listingIds", "title")
      .lean<Array<{ _id: mongoose.Types.ObjectId; title: string; description?: string; discountType: "PERCENT" | "AMOUNT"; discountValue: number; endsAt: Date; listingIds: Array<{ _id: mongoose.Types.ObjectId; title: string }> }>>(),
    BusinessReview.aggregate<{ _id: number; count: number }>([
      { $match: { organizationId: org._id } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
    BusinessReview.find({ organizationId: org._id }).sort({ createdAt: -1 }).limit(REVIEW_PAGE).populate("reviewerId", "name image").lean(),
    viewerId ? BusinessReview.findOne({ organizationId: org._id, reviewerId: viewerId }).populate("reviewerId", "name image").lean() : null,
    viewerId ? canReviewBusiness(viewerId, String(org._id)) : false,
  ]);

  const distribution = [0, 0, 0, 0, 0, 0];
  for (const r of ratingRows) distribution[r._id] = r.count;
  const count = distribution.reduce((a, b) => a + b, 0);
  const average = count ? Math.round((distribution.reduce((sum, c, star) => sum + c * star, 0) / count) * 10) / 10 : 0;

  const isMember = !!viewerId && memberIds.some(id => String(id) === viewerId);
  const viewer: ReviewViewer = !viewerId ? "anon" : isMember ? "member" : eligible || myReview ? "eligible" : "ineligible";
  const forSale = listings.filter(l => l.type !== "RENT").length;
  const forRent = listings.filter(l => l.type !== "SALE").length;
  const since = new Date(org.createdAt).getFullYear();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-10 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 text-2xl font-extrabold text-slate-950 sm:h-20 sm:w-20 sm:text-3xl">
              {org.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{org.name}</h1>
                {isVerified(org.verification) ? (
                  <VerifiedBadge tone="dark" className="px-2.5 py-1" />
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 ring-1 ring-inset ring-white/15">
                    <Building2 size={13} /> Business account
                  </span>
                )}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Building2 size={14} /> {TYPE_LABEL[org.type]}</span>
                {org.city && <span className="flex items-center gap-1"><MapPin size={14} /> {org.city}</span>}
                <span className="flex items-center gap-1"><CalendarDays size={14} /> On AutoMarket since {since}</span>
              </p>
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm ring-1 ring-inset ring-white/10 hover:bg-white/10">
                <StarRating value={average} size={14} />
                <span className="font-semibold">{count ? average.toFixed(1) : "New"}</span>
                <span className="text-slate-400">{count} review{count !== 1 ? "s" : ""}</span>
              </a>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-md">
            {[
              { label: "For sale", value: forSale, icon: Car },
              { label: "For rent", value: forRent, icon: KeyRound },
              { label: "Live deals", value: deals.length, icon: Tag },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-inset ring-white/10">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><s.icon size={12} /> {s.label}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Deals */}
          {deals.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><Tag size={18} className="text-rose-600" /> Current deals</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {deals.map(d => (
                  <div key={String(d._id)} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 p-4 text-white shadow-lg shadow-rose-500/20">
                    <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
                    <p className="relative text-2xl font-extrabold">{dealLabel(d)}</p>
                    <p className="relative mt-0.5 font-semibold">{d.title}</p>
                    {d.description && <p className="relative mt-1 text-sm text-white/85">{d.description}</p>}
                    <p className="relative mt-3 text-xs text-white/80">
                      {d.listingIds.length === 0 ? "On every vehicle for sale" : `On ${d.listingIds.map(l => l.title).join(", ")}`} · ends{" "}
                      {new Date(d.endsAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vehicles: plain JSON for the client component (ObjectIds and Dates don't cross the boundary) */}
          <DealerVehicles
            businessName={org.name}
            listings={JSON.parse(JSON.stringify(listings)) as Array<IListing & { _id: string }>}
          />

          <BusinessReviews
            slug={org.slug}
            businessName={org.name}
            viewer={viewer}
            initialReviews={firstReviews.map(toReviewView)}
            initialSummary={{ average, count }}
            initialHasMore={count > REVIEW_PAGE}
            distribution={distribution}
            myReview={myReview ? toReviewView(myReview) : undefined}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80">
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
                href={`https://wa.me/${org.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${org.name}, I found you on AutoMarket.`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-xl bg-[#25D366] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1ebe5b]"
              >
                WhatsApp {org.name.split(" ")[0]}
              </a>
            )}
          </div>
          {org.description && (
            <div className="rounded-[22px] bg-white p-5 ring-1 ring-slate-200/80">
              <h2 className="text-sm font-semibold text-slate-900">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{org.description}</p>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-[22px] bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            <Star size={16} className="mt-0.5 flex-shrink-0 text-amber-500" fill="currentColor" />
            <p>Reviews come only from people who booked, bought from or messaged this business. <Link href="#reviews" className="font-semibold underline">Read them</Link>.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
