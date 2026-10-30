import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, ChevronRight, ShieldAlert } from "lucide-react";
import ListingCard from "@/components/listings/ListingCard";
import DealCard from "@/components/deals/DealCard";
import { SITE_URL } from "@/lib/site";
import { loadSeoPage } from "@/lib/seoData";
import {
  MIN_INDEXABLE, browseHref, cityFromSlug, makeFromSlug, seoHeading, seoIntro, seoPath, seoTitle, type SeoKind, type SeoPage,
} from "@/lib/seoPages";

/** The page a URL names, or null when it isn't one (unknown city or make). */
export function seoPageFrom(kind: SeoKind, citySlug: string, makeSlug?: string): SeoPage | null {
  const city = cityFromSlug(citySlug);
  if (city === undefined) return null;
  const make = makeSlug === undefined ? null : makeFromSlug(makeSlug);
  if (make === undefined) return null;
  return { kind, city, make };
}

export async function seoMetadata(page: SeoPage | null): Promise<Metadata> {
  if (!page) return { title: "Page not found" };
  const data = await loadSeoPage(page).catch(() => null);
  const count = data?.stats.count ?? 0;
  const title = seoTitle(page, count);
  const description = data ? seoIntro(page, data.stats).slice(0, 160) : seoHeading(page);
  return {
    title,
    description,
    alternates: { canonical: seoPath(page) },
    // An empty page is still useful to a visitor, but not a search result
    ...(count < MIN_INDEXABLE && { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: seoPath(page) },
  };
}

const LINK_LIST = "grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4";

/**
 * A search-landing page (/cars-for-sale/karachi/honda, /rent-a-car/lahore): a heading and intro from the real
 * numbers, the newest live listings, rent deals in the city, links to related pages, and structured data.
 * The same for every visitor, so it is cached; nothing here reads the session.
 */
export default async function SeoListingPage({ page }: { page: SeoPage | null }) {
  if (!page) notFound();
  const data = await loadSeoPage(page);
  const { listings, stats, makes, cities, deals } = data;
  const heading = seoHeading(page);
  const rent = page.kind === "rent";
  const now = new Date().getTime();

  const crumbs = [
    { name: "Marketplace", href: "/listings" },
    { name: rent ? "Rent a car" : "Cars for sale", href: seoPath({ kind: page.kind, city: null, make: null }) },
    ...(page.city ? [{ name: page.city, href: seoPath({ ...page, make: null }) }] : []),
    ...(page.make ? [{ name: page.make, href: seoPath(page) }] : []),
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE_URL}${c.href}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: heading,
      numberOfItems: stats.count,
      itemListElement: listings.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/listings/${l._id}`, name: l.title })),
    },
  ];
  const other = { kind: (rent ? "sale" : "rent") as SeoKind, city: page.city, make: null };

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium text-slate-500">
          {crumbs.map((c, i) => (
            <span key={c.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} aria-hidden className="text-slate-300" />}
              <Link href={c.href} className="transition hover:text-slate-900">{c.name}</Link>
            </span>
          ))}
        </nav>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{heading}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">{seoIntro(page, stats)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {stats.count > 0 && (
            <Link href={browseHref(page)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Filter all {stats.count.toLocaleString("en-PK")} on Browse <ArrowRight size={15} />
            </Link>
          )}
          <Link href={seoPath(other)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            {seoHeading(other)}
          </Link>
        </div>

        {listings.length > 0 ? (
          <section aria-label={heading} className="mt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {listings.map((l, i) => <ListingCard key={l._id} listing={l} compact="phone" eager={i < 4} />)}
            </div>
            {stats.count > listings.length && (
              <div className="mt-6 text-center">
                <Link href={browseHref(page)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  See all {stats.count.toLocaleString("en-PK")} on Browse <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </section>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">Nothing listed here yet</p>
            <p className="mt-1 text-sm text-slate-500">Try all of Pakistan, or be the first to list one.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {page.city && (
                <Link href={seoPath({ ...page, city: null })} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  {seoHeading({ ...page, city: null })}
                </Link>
              )}
              <Link href="/sell" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                {rent ? "List your vehicle for rent" : "Sell your car"}
              </Link>
            </div>
          </div>
        )}

        {deals.length > 0 && (
          <section className="mt-10" aria-label="Rent deals">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Rent deals in {page.city}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {deals.map(d => <DealCard key={d._id} deal={d} now={now} />)}
            </div>
          </section>
        )}

        {/* Related searches: more of the same nearby, and narrower searches here */}
        {makes.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-base font-bold text-slate-900">Popular makes {page.city ? `in ${page.city}` : "in Pakistan"}</h2>
            <ul className={LINK_LIST}>
              {makes.map(m => (
                <li key={m.make}>
                  <Link href={seoPath({ ...page, make: m.make })} className="text-slate-700 hover:text-indigo-700 hover:underline">
                    {seoHeading({ ...page, make: m.make }).replace(page.city ? ` in ${page.city}` : " in Pakistan", "")}
                  </Link>{" "}
                  <span className="text-slate-400">({m.count})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {cities.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-bold text-slate-900">{page.make ? `${page.make} in other cities` : "Other cities"}</h2>
            <ul className={LINK_LIST}>
              {cities.map(c => (
                <li key={c.city}>
                  <Link href={seoPath({ ...page, city: c.city })} className="text-slate-700 hover:text-indigo-700 hover:underline">{seoHeading({ ...page, city: c.city })}</Link>{" "}
                  <span className="text-slate-400">({c.count})</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          <ShieldAlert size={14} className="mt-px flex-shrink-0 text-amber-500" />
          <span>
            {rent
              ? "Check the vehicle and the agreement at pickup, and never pay a full advance to someone you haven't met."
              : "See the car and its documents in person, and check its registration with Excise before you pay anything."}{" "}
            <Link href="/help#safety" className="font-semibold text-slate-700 hover:underline">Safety tips</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
