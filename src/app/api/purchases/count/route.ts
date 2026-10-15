import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { can, getMembership } from "@/lib/business";

export const dynamic = "force-dynamic";

/**
 * Badge counts for purchases: `purchases` is the buyer's unseen updates (accepted, declined, sold),
 * `sales` is the new purchase requests waiting for the business (for members who handle sales).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ purchases: 0, sales: 0 });
    await connectDB();
    const purchases = await Purchase.countDocuments({ buyerId: session.user.id, seenByBuyer: false });
    const member = await getMembership(session.user.id);
    const sales = member && can(member.role, "manageSales")
      ? await Purchase.countDocuments({ organizationId: member.organizationId, status: "REQUESTED" })
      : 0;
    return NextResponse.json({ purchases, sales });
  } catch {
    return NextResponse.json({ purchases: 0, sales: 0 });
  }
}
