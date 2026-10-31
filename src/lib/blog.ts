// The AutoGO blog (/blog): categories, the checks an admin's post must pass, and how a post's text is laid out.
// Client-safe and unit-tested (src/lib/__tests__/blog.test.ts).
//
// A post's body is plain text with a few simple marks, so admins need no editor and nothing is ever rendered as
// HTML (no script can get in):
//   ## A heading          a line starting "## "
//   - a point             lines starting "- " make a bulleted list
//   1. a step             lines starting "1. ", "2. " … make a numbered list
//   > a tip               a line starting "> " is a highlighted note
//   **bold**              inside any line
// Blank lines separate paragraphs.

import { isUploadedImageUrl } from "@/lib/uploadUrls";

export const BLOG_CATEGORIES = ["BUYING", "SELLING", "RENTING", "SAFETY", "MONEY", "NEWS"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY: Record<BlogCategory, { label: string; text: string }> = {
  BUYING: { label: "Buying guide", text: "text-indigo-600" },
  SELLING: { label: "Selling tips", text: "text-emerald-600" },
  RENTING: { label: "Renting", text: "text-sky-600" },
  SAFETY: { label: "Safety", text: "text-rose-600" },
  MONEY: { label: "Money & finance", text: "text-amber-600" },
  NEWS: { label: "AutoGO news", text: "text-fuchsia-600" },
};

export const BLOG_LIMITS = { titleMin: 5, title: 120, excerpt: 300, bodyMin: 80, body: 20_000, slug: 80 };
/** Posts on one page of /blog */
export const BLOG_PAGE_SIZE = 12;

export type BlogStatus = "DRAFT" | "PUBLISHED";

/** A post as the pages and the admin panel use it (ids and dates as strings). */
export type BlogPost = {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  coverImage?: string;
  status: BlogStatus;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

/** "Buying a used car in Pakistan!" → "buying-a-used-car-in-pakistan" */
export function blogSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, BLOG_LIMITS.slug)
    .replace(/-$/, "");
}

export type BlogInput = { title: string; slug: string; excerpt: string; body: string; category: BlogCategory; coverImage?: string };

/** Checks an admin's post. `partial` (an edit) checks only the fields sent. */
export function parseBlogPost(body: Record<string, unknown>, partial = false): { data?: Partial<BlogInput>; error?: string } {
  const has = (k: string) => k in body;
  const text = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const data: Partial<BlogInput> = {};
  const L = BLOG_LIMITS;

  if (!partial || has("title")) {
    const title = text("title").replace(/\s+/g, " ");
    if (title.length < L.titleMin) return { error: `Give the post a title of at least ${L.titleMin} characters` };
    if (title.length > L.title) return { error: `The title can be at most ${L.title} characters` };
    data.title = title;
  }
  // The web address: the one typed, else (a new post) made from the title. An edit changes it only when sent.
  if (!partial || has("slug")) {
    const slug = blogSlug(text("slug") || (partial ? "" : data.title ?? ""));
    if (slug.length < 3) return { error: "The web address needs at least 3 letters or numbers" };
    data.slug = slug;
  }
  if (!partial || has("excerpt")) {
    const excerpt = text("excerpt").replace(/\s+/g, " ");
    if (!excerpt) return { error: "Write a short summary (shown on the blog page and in Google)" };
    if (excerpt.length > L.excerpt) return { error: `The summary can be at most ${L.excerpt} characters` };
    data.excerpt = excerpt;
  }
  if (!partial || has("body")) {
    const text_ = typeof body.body === "string" ? body.body.replace(/\r\n/g, "\n").trim() : "";
    if (text_.length < L.bodyMin) return { error: `The post needs at least ${L.bodyMin} characters of text` };
    if (text_.length > L.body) return { error: `The post can be at most ${L.body.toLocaleString()} characters` };
    data.body = text_;
  }
  if (!partial || has("category")) {
    if (!BLOG_CATEGORIES.includes(body.category as BlogCategory)) return { error: "Choose a category" };
    data.category = body.category as BlogCategory;
  }
  if (has("coverImage")) {
    const cover = text("coverImage");
    if (cover && !isUploadedImageUrl(cover)) return { error: "Upload the cover photo here" };
    data.coverImage = cover || undefined;
  }
  return { data };
}

export type BlogBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "note"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

/** Turns a post's text into headings, paragraphs, notes and lists (see the marks at the top of this file). */
export function blogBlocks(body: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
    para = [];
  };
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const bullet = /^[-•*]\s+(.*)$/.exec(line);
    const step = /^\d+[.)]\s+(.*)$/.exec(line);
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("> ")) {
      flush();
      blocks.push({ type: "note", text: line.slice(2).trim() });
    } else if (bullet || step) {
      flush();
      const ordered = !bullet;
      const item = (bullet ?? step)![1];
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ type: "list", ordered, items: [item] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** A line split into plain and **bold** parts, drawn as text (never as HTML). */
export function inlineParts(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false });
}

/** About 200 words a minute, at least 1. */
export function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "12 Oct 2026" in Pakistan time. */
export function blogDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}
