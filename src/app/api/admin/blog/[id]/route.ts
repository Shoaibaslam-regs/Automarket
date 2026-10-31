import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/adminAuth";
import { BlogPost } from "@/models/BlogPost";
import { logAdminAction } from "@/lib/adminLog";
import { parseBlogPost } from "@/lib/blog";
import { invalidateBlog } from "@/lib/pageCache";
import { reportError } from "@/lib/errorLog";

type Params = { params: Promise<{ id: string }> };

async function find(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return BlogPost.findById(id);
}

/** One post with its text, for the editor. */
export async function GET(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const post = await find((await params).id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    reportError("Admin blog post GET error:", error);
    return NextResponse.json({ error: "Failed to load the post" }, { status: 500 });
  }
}

/**
 * Edits a post (only the fields sent, see parseBlogPost), and with `publish: true` or `publish: false` publishes
 * it (dated now the first time) or takes it back to a draft.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const post = await find((await params).id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) ?? {};
    const parsed = parseBlogPost(body, true);
    if (parsed.error !== undefined || !parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const oldSlug = post.slug;
    if (parsed.data.slug && parsed.data.slug !== oldSlug && (await BlogPost.exists({ slug: parsed.data.slug, _id: { $ne: post._id } }))) {
      return NextResponse.json({ error: "Another post already uses this web address. Change it a little." }, { status: 409 });
    }
    post.set(parsed.data);
    let action = "blog.update";
    if (body.publish === true && post.status !== "PUBLISHED") {
      post.status = "PUBLISHED";
      post.publishedAt ??= new Date();
      action = "blog.publish";
    } else if (body.publish === false && post.status === "PUBLISHED") {
      post.status = "DRAFT";
      action = "blog.unpublish";
    }
    await post.save();
    invalidateBlog(oldSlug, post.slug);
    await logAdminAction(gate.admin, action, { type: "BLOG", id: post._id, label: post.title });
    return NextResponse.json({ post });
  } catch (error) {
    reportError("Admin blog PATCH error:", error);
    return NextResponse.json({ error: "Failed to save the post" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    await connectDB();
    const post = await find((await params).id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    await post.deleteOne();
    invalidateBlog(post.slug);
    await logAdminAction(gate.admin, "blog.delete", { type: "BLOG", id: post._id, label: post.title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin blog DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete the post" }, { status: 500 });
  }
}
