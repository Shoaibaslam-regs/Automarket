import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock3 } from "lucide-react";
import Footer from "@/components/Footer";
import BlogBody from "@/components/blog/BlogBody";
import BlogCard from "@/components/blog/BlogCard";
import ShareButton from "@/components/ShareButton";
import { BLOG_CATEGORY, blogDate, readingMinutes } from "@/lib/blog";
import { getPublishedPost, getPublishedPosts } from "@/lib/publicBlog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Cached for everyone like listing and deal pages: built on the first visit, then served by the CDN, and cleared
// straight away when an admin changes the post (invalidateBlog). Never read the session here.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug).catch(() => null);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.publishedAt },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const cat = BLOG_CATEGORY[post.category];
  const others = (await getPublishedPosts().catch(() => [])).filter(p => p.slug !== post.slug);
  // More from the same category first, then the newest
  const related = [...others.filter(p => p.category === post.category), ...others.filter(p => p.category !== post.category)].slice(0, 3);

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      image: post.coverImage ? [post.coverImage] : undefined,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 2, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="mx-auto max-w-[720px] px-4 pb-12 pt-8 sm:pt-12">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> All posts
        </Link>
        <p className="mt-6 flex flex-wrap items-center gap-x-2 text-xs font-semibold">
          <Link href={`/blog?category=${post.category}`} className={`uppercase tracking-wider ${cat.text} hover:underline`}>{cat.label}</Link>
          <span className="text-slate-300" aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-500"><Clock3 size={12} aria-hidden /> {readingMinutes(post.body)} min read</span>
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-500">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-3">
          <p className="text-sm text-slate-500">
            By <span className="font-semibold text-slate-800">The AutoGO team</span>
            {post.publishedAt && <> · {blogDate(post.publishedAt)}</>}
          </p>
          <ShareButton path={`/blog/${post.slug}`} variant="pill" title={post.title} />
        </div>
        {post.coverImage && (
          <span className="relative mt-6 block aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
            <Image src={post.coverImage} alt="" fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" priority />
          </span>
        )}
        <div className="mt-8"><BlogBody body={post.body} /></div>

        <div className="mt-10 rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-base font-bold">Find your next car on AutoGO</p>
          <p className="mt-1 text-sm text-slate-400">Cars and bikes for sale and rent across Pakistan, from private sellers and verified businesses.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/listings" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Browse vehicles</Link>
            <Link href="/sell" className="rounded-xl px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 hover:bg-white/10">Sell yours</Link>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-label="More from the blog" className="border-t border-slate-100 bg-slate-50 px-4 py-10">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Keep reading</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(p => <BlogCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}
