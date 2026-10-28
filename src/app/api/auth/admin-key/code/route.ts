import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { adminGateUser } from "@/lib/adminGate";
import { adminCodeWait, issueAdminCode } from "@/lib/adminCode";
import { hitRateLimit } from "@/lib/rateLimit";
import { maskDestination } from "@/lib/signupCode";
import { reportError } from "@/lib/errorLog";
import { waitText } from "@/lib/waitText";

/** "Send a new code" on the admin form: only while the form is open (the gate cookie names the admin). */
export async function POST(req: NextRequest) {
  try {
    const adminId = adminGateUser(req.headers.get("cookie"));
    if (!adminId) return NextResponse.json({ error: "Enter your admin key again" }, { status: 401 });
    await connectDB();
    // Too soon: say so without using up the hourly cap
    const early = await adminCodeWait(adminId);
    if (early > 0) {
      return NextResponse.json({ error: `Please wait ${waitText(early)} before asking for another code. The last one still works.`, code: "RATE_LIMITED", retryAfter: early },
        { status: 429, headers: { "Retry-After": String(early) } });
    }
    const limit = await hitRateLimit("adminCodeSend", adminId);
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many codes sent. Check your inbox, or try again later.", code: "RATE_LIMITED", retryAfter: limit.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
    }
    await connectDB();
    const issued = await issueAdminCode(adminId);
    if (!issued) return NextResponse.json({ error: "Enter your admin key again" }, { status: 401 });
    // Each code in a row waits longer; the earlier code still works meanwhile
    if (!issued.sent) {
      return NextResponse.json({ error: `Please wait ${waitText(issued.resendIn)} before asking for another code. The last one still works.`, code: "RATE_LIMITED", retryAfter: issued.resendIn },
        { status: 429, headers: { "Retry-After": String(issued.resendIn) } });
    }
    return NextResponse.json({ ok: true, sentTo: maskDestination("email", issued.email), resendIn: issued.resendIn });
  } catch (error) {
    reportError("Admin code resend error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
