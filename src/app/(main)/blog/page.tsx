import Link from "next/link";
import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import Footer from "@/components/Footer";
import BlogCard from "@/components/blog/BlogCard";
import { BLOG_CATEGORIES, BLOG_CATEGORY, BLOG_PAGE_SIZE } from "@/lib/blog";
import { getPublishedPosts, isBlogCategory } from "@/lib/publicBlog";
import { reportError } from "@/lib/errorLog";

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
  const all = await getPublishedPosts().catch(err => {
    reportError("Blog list failed:", err);
    return [];
  });
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
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1180px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <Newspaper size={13} /> AutoGO Blog
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Guides for every drive</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-slate-400">
            Checklists, safety tips and money advice for buying, selling and renting cars and bikes in Pakistan.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:py-10">
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
