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

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      // Every serverless instance keeps its own pool, so keep it small: many instances at peak times
      // would otherwise use up the cluster's connection limit (the driver's default is 100 each)
      .connect(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10_000 })
      .then((m) => m.connection);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}