// One-time (safe to re-run): adds the starter guides in src/lib/blogStarter.ts to the blog as published posts.
// Posts whose web address already exists are left alone, so admins' edits and deletions of other posts stay.
//   npm run seed-blog
import { connectDB } from "../lib/mongodb";
import { BlogPost } from "../models/BlogPost";
import { STARTER_POSTS } from "../lib/blogStarter";

const DAY = 86_400_000;

async function seedBlog() {
  await connectDB();
  let added = 0;
  // Dated a day apart, oldest first, so the list keeps the order they are written in
  for (const [i, post] of STARTER_POSTS.entries()) {
    const publishedAt = new Date(Date.now() - (STARTER_POSTS.length - 1 - i) * DAY);
    const res = await BlogPost.updateOne({ slug: post.slug }, { $setOnInsert: { ...post, status: "PUBLISHED", publishedAt } }, { upsert: true });
    if (res.upsertedCount) added++;
  }
  console.log(`Blog: added ${added} starter post${added === 1 ? "" : "s"}, ${STARTER_POSTS.length - added} already there.`);
  process.exit(0);
}

seedBlog().catch(err => {
  console.error(err);
  process.exit(1);
});
