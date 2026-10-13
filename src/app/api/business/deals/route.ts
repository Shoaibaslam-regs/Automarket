import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { can, getMembership } from "@/lib/business";
import { getDealableListings, parseDealInput } from "@/lib/dealInput";
import { invalidateBusinessPage } from "@/lib/pageCache";

export const dynamic = "force-dynamic";

/** The business's deals, plus the vehicles a deal can cover. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const [deals, listings] = await Promise.all([
      Deal.find({ organizationId: member.organizationId }).sort({ endsAt: -1 }).populate("createdBy", "name").lean(),
      getDealableListings(session.user.id),
    ]);
    return NextResponse.json({
      deals,
      vehicles: listings.map(l => ({ id: String(l._id), title: l.title, price: l.price, image: l.images?.[0] ?? null })),
      permissions: { canManage: can(member.role, "manageDeals") },
    });
  } catch (error) {
    console.error("Deals GET error:", error);
    return NextResponse.json({ error: "Failed to load deals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageDeals")) return NextResponse.json({ error: "Only the owner or a manager can create deals" }, { status: 403 });

    const parsed = await parseDealInput(await req.json().catch(() => null), session.user.id);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const deal = await Deal.create({ ...parsed.data, organizationId: member.organizationId, createdBy: session.user.id });
    await invalidateBusinessPage(member.organizationId);
    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error("Deals POST error:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
