import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * Uptime check for monitors (e.g. UptimeRobot): 200 when the database answers, 503 when it doesn't.
 * Never returns error details, since anyone can call it.
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    return NextResponse.json({ status: "ok", db: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    reportError("Health check failed:", error);
    return NextResponse.json({ status: "error", db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
