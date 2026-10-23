import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL!;

if (!MONGODB_URI) {
  throw new Error("Please define DATABASE_URL in .env");
}

declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * The longest a request waits for the database, DNS lookup included. serverSelectionTimeoutMS doesn't cover the
 * mongodb+srv DNS lookup, which can hang for half a minute or more when the network is down: that pushed builds
 * past Next's 60 s page limit and would leave API routes running into Vercel's 30 s cap.
 */
const CONNECT_TIMEOUT_MS = 10_000;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const attempt = mongoose
      // Every serverless instance keeps its own pool, so keep it small: many instances at peak times
      // would otherwise use up the cluster's connection limit (the driver's default is 100 each)
      .connect(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10_000 })
      .then((m) => m.connection);
    cached.promise = attempt;
    // Forget a failed attempt so the next request tries again; otherwise one network blip (an Atlas DNS or
    // timeout error) would break every page until the server restarts. A request that gave up waiting leaves
    // the attempt running, so a slow connect that does finish is still used by the next request.
    attempt.catch(() => {
      if (cached.promise === attempt) cached.promise = null;
    });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s`)), CONNECT_TIMEOUT_MS);
  });
  try {
    cached.conn = await Promise.race([cached.promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
  return cached.conn;
}
