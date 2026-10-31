import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { BlogPost as BlogPostModel } from "@/models/BlogPost";
import { BLOG_CATEGORIES, type BlogCategory, type BlogPost } from "@/lib/blog";
import { BLOG_TAG, PUBLIC_CACHE_SECONDS, blogTag } from "@/lib/pageCache";

// What the public blog pages read: published posts only, cached for everyone (tags BLOG_TAG and blog:<slug>,
// cleared by invalidateBlog when an admin changes a post), so the pages never hit the database per visitor.

const LIST_FIELDS = "slug title excerpt category coverImage status publishedAt updatedAt";
/** Posts the blog list reads at most (the newest); far more than a blog page shows */
const LIST_POOL = 300;

/** Published posts, newest first, without their text. */
export function getPublishedPosts(): Promise<Omit<BlogPost, "body">[]> {
  return unstable_cache(
    async () => {
      await connectDB();
      const posts = await BlogPostModel.find({ status: "PUBLISHED" }).sort({ publishedAt: -1 }).limit(LIST_POOL).select(LIST_FIELDS).lean();
      return JSON.parse(JSON.stringify(posts));
    },
    ["blog-list"],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [BLOG_TAG] }
  )();
}

/** One published post by its address, or null. */
export function getPublishedPost(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return Promise.resolve(null);
  return unstable_cache(
    async () => {
      await connectDB();
      const post = await BlogPostModel.findOne({ slug, status: "PUBLISHED" }).lean();
      return post ? JSON.parse(JSON.stringify(post)) : null;
    },
    ["blog-post", slug],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [blogTag(slug), BLOG_TAG] }
  )();
}

export const isBlogCategory = (v: unknown): v is BlogCategory => BLOG_CATEGORIES.includes(v as BlogCategory);
