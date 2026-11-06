import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Fuel, Newspaper } from "lucide-react";
import Footer from "@/components/Footer";
import BlogCard from "@/components/blog/BlogCard";
import { BLOG_CATEGORIES, BLOG_CATEGORY, BLOG_PAGE_SIZE } from "@/lib/blog";
import { getPublishedPosts, isBlogCategory } from "@/lib/publicBlog";
import { reportError } from "@/lib/errorLog";
import { getFuelPageData, latestCheck } from "@/lib/publicFuel";
import UpdatedTag from "@/components/fuel/UpdatedTag";
import { fuelDate } from "@/lib/fuelPrices";

export const metadata: Metadata = {
  title: "Blog: car buying, selling and renting guides",
  description: "Guides for buying, selling and renting cars and bikes in Pakistan: checklists, safety tips, financing and AutoGO news.",
  alternates: { canonical: "/blog" },
};

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

/** The AutoGO blog: the newest post large, then the rest, with a category filter and pages of BLOG_PAGE_SIZE. */
export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = isBlogCategory(sp.category) ? sp.category : null;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const [all, fuel] = await Promise.all([
    getPublishedPosts().catch(err => {
      reportError("Blog list failed:", err);
      return [];
    }),
    getFuelPageData().catch(() => null),
  ]);
  const petrol = fuel?.pk.PETROL;
  const diesel = fuel?.pk.DIESEL;
  const filtered = category ? all.filter(p => p.category === category) : all;
  const shown = filtered.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);
  const [featured, ...rest] = page === 1 ? shown : [undefined, ...shown];
  const pages = Math.ceil(filtered.length / BLOG_PAGE_SIZE);
  const used = new Set(all.map(p => p.category));
  const href = (c: string | null, p = 1) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (p > 1) q.set("page", String(p));
    return q.size ? `/blog?${q}` : "/blog";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-12 pt-12 text-white sm:pt-16">
        <div className="relative mx-auto max-w-[1180px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <Newspaper size={13} /> AutoGO Blog
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Guides for every drive</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-slate-400">
            Checklists, safety tips and money advice for buying, selling and renting cars and bikes in Pakistan.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:py-10">
        {/* Today's approved fuel prices, linking to the full Fuel prices page */}
        <Link href="/fuel-prices" className="group mb-6 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><Fuel size={17} className="text-indigo-600" /> Fuel prices</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-600">
            {petrol && diesel ? (
              <>
                <span>Petrol <strong className="tabular-nums text-slate-900">PKR {petrol.price.toFixed(2)}</strong></span>
                <span>Diesel <strong className="tabular-nums text-slate-900">PKR {diesel.price.toFixed(2)}</strong></span>
                <span className="text-xs text-slate-400">per litre, from {fuelDate(petrol.effectiveDate)}</span>
                {/* Only when checked on another day than the prices took effect, so the date isn't repeated */}
                {fuelDate(latestCheck(fuel) ?? petrol.effectiveDate) !== fuelDate(petrol.effectiveDate) && <UpdatedTag at={latestCheck(fuel)} />}
              </>
            ) : <span>Pakistan&apos;s official petrol and diesel prices, updated daily</span>}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-600">See prices &amp; trends <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
        </Link>

        {all.length > 0 && (
          <nav aria-label="Categories" className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[null, ...BLOG_CATEGORIES.filter(c => used.has(c))].map(c => {
              const active = c === category;
              return (
                <Link key={c ?? "all"} href={href(c)} aria-current={active ? "page" : undefined}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-slate-900 hover:ring-slate-300"}`}>
                  {c ? BLOG_CATEGORY[c].label : "All posts"}
                </Link>
              );
            })}
          </nav>
        )}

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Newspaper size={24} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-semibold text-slate-900">{category ? "No posts in this category yet" : "The first posts are on their way"}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Meanwhile, the Help page explains how buying, renting and selling work.</p>
            <Link href={category ? "/blog" : "/help"} className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              {category ? "See all posts" : "Open Help & safety"}
            </Link>
          </div>
        ) : (
          <>
            {featured && <div className="mb-6"><BlogCard post={featured} featured /></div>}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map(p => p && <BlogCard key={p.slug} post={p} />)}
              </div>
            )}
            {pages > 1 && (
              <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
                {page > 1 && <Link href={href(category, page - 1)} className="font-semibold text-slate-700 hover:text-slate-900">← Newer</Link>}
                <span className="text-slate-400">Page {page} of {pages}</span>
                {page < pages && <Link href={href(category, page + 1)} className="font-semibold text-slate-700 hover:text-slate-900">Older →</Link>}
              </nav>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
