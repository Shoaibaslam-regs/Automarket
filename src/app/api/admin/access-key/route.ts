import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdminApi, isPlatformOwner } from "@/lib/adminAuth";
import { hitRateLimit, isRateLimited, waitText } from "@/lib/rateLimit";
import { adminKeyProblem, adminKeyStatus, checkAdminAccessKey, setAdminAccessKey } from "@/lib/adminKey";
import { logAdminAction } from "@/lib/adminLog";
import { User } from "@/models/User";
import { reportError } from "@/lib/errorLog";

const limited = (sec: number) =>
  NextResponse.json({ error: `Too many wrong passwords. Please try again in ${waitText(sec)}.`, code: "RATE_LIMITED", retryAfter: sec }, { status: 429, headers: { "Retry-After": String(sec) } });

/** Whether this admin may change the access key (platform owner only), and where the current key comes from. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  if (!isPlatformOwner(gate.admin.email)) return NextResponse.json({ canChange: false });
  return NextResponse.json({ canChange: true, ...(await adminKeyStatus()) });
}

/**
 * Changes the admin access key. Platform owner only. Body: { password, newKey }.
 * The new key works at once and the old one (panel or ADMIN_ACCESS_KEY) stops working.
 */
export async function PUT(req: NextRequest) {
  const gate = await requireAdminApi("settings");
  if (!gate.ok) return gate.response;
  if (!isPlatformOwner(gate.admin.email)) {
    return NextResponse.json({ error: "Only the platform owner can change the admin access key" }, { status: 403 });
  }
  try {
    const id = String(gate.admin._id);
    const before = await isRateLimited("adminKeyChange", id);
    if (!before.ok) return limited(before.retryAfterSec);

    const { password, newKey } = await req.json().catch(() => ({}));
    const user = await User.findById(gate.admin._id).select("password").lean<{ password?: string }>();
    if (!user?.password || typeof password !== "string" || !(await bcrypt.compare(password, user.password))) {
      const hit = await hitRateLimit("adminKeyChange", id);
      if (hit.remaining === 0) return limited(hit.retryAfterSec);
      return NextResponse.json({ error: "Your password is incorrect" }, { status: 400 });
    }

    const key = typeof newKey === "string" ? newKey.trim() : "";
    const problem = adminKeyProblem(key);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (await checkAdminAccessKey(key)) return NextResponse.json({ error: "That is already the current key. Choose a new one." }, { status: 400 });

    const changedAt = await setAdminAccessKey(key, gate.admin._id);
    // Never log the key itself
    await logAdminAction(gate.admin, "settings.adminKey", { type: "SETTINGS", label: "Admin access key" }, "Key changed from the admin panel");
    return NextResponse.json({ source: "panel", changedAt });
  } catch (error) {
    reportError("Admin access key PUT error:", error);
    return NextResponse.json({ error: "Failed to change the key" }, { status: 500 });
  }
}
