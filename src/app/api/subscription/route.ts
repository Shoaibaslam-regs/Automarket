import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getSubscription, getUsage } from "@/lib/subscription";
import { quotaResetsAt } from "@/lib/plans";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/** The signed-in user's plan, its limits and how much of each they use. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const sub = await getSubscription(session.user.id);
    const usage = await getUsage(session.user.id, sub);
    return NextResponse.json({
      planId: sub.planId,
      storedPlanId: sub.storedPlanId,
      expiresAt: sub.expiresAt,
      source: sub.source,
      inheritedFromOwner: sub.inheritedFromOwner,
      hasBusiness: !!sub.organizationId,
      limits: sub.plan.limits,
      usage,
      // The listing limit is per calendar month; this is when it starts again
      listingsResetAt: quotaResetsAt(),
      // Whole days until a paid plan ends (it then falls back to Free); null on Free
      planDaysLeft: sub.expiresAt ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86_400_000)) : null,
    });
  } catch (error) {
    reportError("Subscription error:", error);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}
