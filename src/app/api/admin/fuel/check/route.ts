import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { runFuelJobs } from "@/lib/fuelJobs";
import { logAdminAction } from "@/lib/adminLog";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

/** "Check now": runs the price check straight away (a few times an hour at most). */
export async function POST() {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  const limited = await rateLimitResponse("fuelCheck", String(gate.admin._id), "checks");
  if (limited) return limited;
  try {
    const result = await runFuelJobs(new Date());
    await logAdminAction(gate.admin, "fuel.check", { type: "FUEL", label: "Fuel price check" }, JSON.stringify(result).slice(0, 400));
    return NextResponse.json(result);
  } catch (error) {
    reportError("Admin fuel check error:", error);
    return NextResponse.json({ error: "The check failed" }, { status: 500 });
  }
}
