import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { TeamRequest } from "@/models/TeamRequest";
import "@/models/Organization";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * Plan and Verified badge requests. `?status=waiting` (default) or `done` (handled or refused, newest first, 100);
 * `?count=1` only counts the waiting ones, for the sidebar badge.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    if (req.nextUrl.searchParams.get("count") === "1") {
      return NextResponse.json({ waiting: await TeamRequest.countDocuments({ status: "WAITING" }) });
    }
    const done = req.nextUrl.searchParams.get("status") === "done";
    const requests = await TeamRequest.find(done ? { status: { $in: ["DONE", "REFUSED"] } } : { status: "WAITING" })
      .sort(done ? { handledAt: -1 } : { createdAt: 1 })
      .limit(100)
      .populate("userId", "name email image plan planExpiresAt planSource")
      .populate("organizationId", "name slug logo verification.verifiedAt verification.expiresAt verification.requestedAt")
      .populate("takenBy", "name email")
      .populate("handledBy", "name email")
      .lean();
    return NextResponse.json({ requests, waiting: done ? await TeamRequest.countDocuments({ status: "WAITING" }) : requests.length });
  } catch (error) {
    reportError("Admin requests GET error:", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}
