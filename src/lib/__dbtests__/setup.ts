import { afterAll, beforeAll, inject, vi } from "vitest";

// Runs before every database test file: point the app at the throwaway database (before any app module loads, since
// src/lib/mongodb.ts reads DATABASE_URL when imported), quiet Next-only helpers, and start each file empty.
const uri = inject("mongoUri");
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(uri)) throw new Error("Database tests only run against the local in-memory database");
process.env.DATABASE_URL = uri;
process.env.EMAIL_DISABLED = "1";
for (const k of ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "GEMINI_API_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]) delete process.env[k];

// Cache clearing and after() only work inside a Next request
vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}));
vi.mock("next/server", async importOriginal => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: unknown) => { if (typeof task === "function") void Promise.resolve().then(task as () => unknown).catch(() => {}); },
}));

beforeAll(async () => {
  const { connectDB } = await import("@/lib/mongodb");
  await connectDB();
  const { default: mongoose } = await import("mongoose");
  // Wait for every loaded model's indexes (the races rely on unique ones), then empty its collection. Dropping the
  // whole database instead raced the models creating their collections as they load.
  await Promise.all(Object.values(mongoose.models).map(async m => { await m.init(); await m.deleteMany({}); }));
});

afterAll(async () => {
  const { default: mongoose } = await import("mongoose");
  await mongoose.disconnect();
});
