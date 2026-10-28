import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { adminGateUser } from "@/lib/adminGate";
import { issueAdminCode } from "@/lib/adminCode";
import { hitRateLimit } from "@/lib/rateLimit";
import { maskDestination } from "@/lib/signupCode";
import { reportError } from "@/lib/errorLog";

/** "Send a new code" on the admin form: only while the form is open (the gate cookie names the admin). */
export async function POST(req: NextRequest) {
  try {
    const adminId = adminGateUser(req.headers.get("cookie"));
    if (!adminId) return NextResponse.json({ error: "Enter your admin key again" }, { status: 401 });
    const limit = await hitRateLimit("adminCodeSend", adminId);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many codes sent. Check your inbox, or try again later.", code: "RATE_LIMITED", retryAfter: limit.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
    }
    await connectDB();
    const email = await issueAdminCode(adminId);
    if (!email) return NextResponse.json({ error: "Enter your admin key again" }, { status: 401 });
    return NextResponse.json({ ok: true, sentTo: maskDestination("email", email) });
  } catch (error) {
    reportError("Admin code resend error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
