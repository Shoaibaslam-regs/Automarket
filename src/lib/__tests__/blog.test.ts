import { describe, expect, it } from "vitest";
import { blogBlocks, blogSlug, inlineParts, parseBlogPost, readingMinutes } from "@/lib/blog";
import { STARTER_POSTS } from "@/lib/blogStarter";

const body = "A useful guide for people buying their first car in Pakistan, with every step explained clearly.";
const good = { title: "Buying a used car in Pakistan", excerpt: "What to check.", body, category: "BUYING" };

describe("blog posts", () => {
  it("makes web addresses from titles", () => {
    expect(blogSlug("Buying a Used Car in Pakistan: 2026 Checklist!")).toBe("buying-a-used-car-in-pakistan-2026-checklist");
    expect(blogSlug("  --Hello   World--  ")).toBe("hello-world");
  });

  it("accepts a full post and makes its address from the title", () => {
    expect(parseBlogPost(good)).toEqual({ data: { ...good, slug: "buying-a-used-car-in-pakistan" } });
    expect(parseBlogPost({ ...good, slug: "Used Car Checklist" }).data?.slug).toBe("used-car-checklist");
  });

  it("refuses short, long or unsafe input", () => {
    expect(parseBlogPost({ ...good, title: "Hi" }).error).toMatch(/title/);
    expect(parseBlogPost({ ...good, excerpt: "" }).error).toMatch(/summary/);
    expect(parseBlogPost({ ...good, body: "Too short" }).error).toMatch(/at least/);
    expect(parseBlogPost({ ...good, category: "SPAM" }).error).toMatch(/category/);
    expect(parseBlogPost({ ...good, coverImage: "https://evil.example/x.jpg" }).error).toMatch(/cover/);
    expect(parseBlogPost({ ...good, coverImage: "https://abc.ufs.sh/f/x.jpg" }).data?.coverImage).toBe("https://abc.ufs.sh/f/x.jpg");
  });

  it("checks only the fields an edit sends", () => {
    expect(parseBlogPost({ title: "A better title here" }, true)).toEqual({ data: { title: "A better title here" } });
    expect(parseBlogPost({ coverImage: "" }, true)).toEqual({ data: { coverImage: undefined } });
  });

  it("lays out headings, paragraphs, notes and lists", () => {
    const blocks = blogBlocks("Intro line one\nline two\n\n## Documents\n- Registration book\n- CNIC\n\n1. Visit\n2. Pay\n> Never pay in advance");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Intro line one line two" },
      { type: "heading", text: "Documents" },
      { type: "list", ordered: false, items: ["Registration book", "CNIC"] },
      { type: "list", ordered: true, items: ["Visit", "Pay"] },
      { type: "note", text: "Never pay in advance" },
    ]);
  });

  it("finds **bold** words inside a line", () => {
    expect(inlineParts("**Down payment:** paid first")).toEqual([{ text: "Down payment:", bold: true }, { text: " paid first", bold: false }]);
    expect(inlineParts("no marks")).toEqual([{ text: "no marks", bold: false }]);
  });

  it("counts reading time", () => {
    expect(readingMinutes("word ".repeat(50))).toBe(1);
    expect(readingMinutes("word ".repeat(1000))).toBe(5);
  });

  it("ships starter guides that pass the same checks, each with its own address", () => {
    expect(STARTER_POSTS.length).toBeGreaterThanOrEqual(5);
    for (const p of STARTER_POSTS) expect(parseBlogPost(p).error).toBeUndefined();
    expect(new Set(STARTER_POSTS.map(p => p.slug)).size).toBe(STARTER_POSTS.length);
  });
});
