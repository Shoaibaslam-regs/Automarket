import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getSubscription, getUsage } from "@/lib/subscription";

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
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}
