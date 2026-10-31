import Image from "next/image";
import Link from "next/link";
import { PhotoSkeleton } from "@/components/ui/PageSkeleton";
import { BLOG_CATEGORY, blogDate, type BlogPost } from "@/lib/blog";

type Card = Pick<BlogPost, "slug" | "title" | "excerpt" | "category" | "coverImage" | "publishedAt">;

/** A post on the blog list: the cover (or the faded AutoGO mark), category, title, summary and date. Server-safe. */
export default function BlogCard({ post, featured = false }: { post: Card; featured?: boolean }) {
  const cat = BLOG_CATEGORY[post.category];
  return (
    <Link href={`/blog/${post.slug}`}
      className={`group flex overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 ${featured ? "flex-col md:flex-row" : "flex-col"}`}>
      <span className={`relative block flex-shrink-0 overflow-hidden ${featured ? "aspect-[16/9] md:aspect-auto md:w-[55%]" : "aspect-[16/9]"}`}>
        <PhotoSkeleton className="absolute inset-0" size={featured ? "lg" : "sm"} />
        {post.coverImage && (
          <Image src={post.coverImage} alt="" fill sizes={featured ? "(min-width: 768px) 600px, 100vw" : "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition duration-500 group-hover:scale-[1.03]" priority={featured} />
        )}
      </span>
      <span className={`flex flex-1 flex-col ${featured ? "p-5 sm:p-7 md:justify-center" : "p-4 sm:p-5"}`}>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${cat.text}`}>{cat.label}</span>
        <span className={`mt-1.5 font-bold leading-snug text-slate-900 group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-4 ${featured ? "text-xl sm:text-2xl" : "line-clamp-2 text-base"}`}>{post.title}</span>
        <span className={`mt-2 text-sm leading-relaxed text-slate-500 ${featured ? "line-clamp-3" : "line-clamp-2"}`}>{post.excerpt}</span>
        {post.publishedAt && <span className="mt-auto pt-3 text-xs text-slate-400">{blogDate(post.publishedAt)}</span>}
      </span>
    </Link>
  );
}
