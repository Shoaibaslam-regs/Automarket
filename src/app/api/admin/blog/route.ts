import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/adminAuth";
import { BlogPost } from "@/models/BlogPost";
import { logAdminAction } from "@/lib/adminLog";
import { parseBlogPost } from "@/lib/blog";
import { invalidateBlog } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

/** Every post for Admin → Blog (drafts and published), newest first, without their text. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const posts = await BlogPost.find().sort({ updatedAt: -1 }).limit(500)
      .select("slug title excerpt category coverImage status publishedAt updatedAt createdAt").lean();
    return NextResponse.json({ posts });
  } catch (error) {
    reportError("Admin blog GET error:", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

/** A new post (see parseBlogPost). It is a draft unless `publish: true`. */
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const body = (await req.json().catch(() => ({}))) ?? {};
    const parsed = parseBlogPost(body);
    if (parsed.error !== undefined || !parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (await BlogPost.exists({ slug: parsed.data.slug })) {
      return NextResponse.json({ error: "Another post already uses this web address. Change it a little." }, { status: 409 });
    }
    const publish = body.publish === true;
    const post = await BlogPost.create({
      ...parsed.data, status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : undefined, createdBy: gate.admin._id,
    });
    if (publish) invalidateBlog(post.slug);
    await logAdminAction(gate.admin, publish ? "blog.publish" : "blog.draft", { type: "BLOG", id: post._id, label: post.title });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    reportError("Admin blog POST error:", error);
    return NextResponse.json({ error: "Failed to save the post" }, { status: 500 });
  }
}
