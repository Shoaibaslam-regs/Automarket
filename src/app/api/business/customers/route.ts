import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const customers = await Customer.find({ organizationId: user.organizationId })
      .populate("interestedIn", "title make model year price")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 }).lean();
    return NextResponse.json({ customers });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const overLimit = await checkPlanLimit(session.user.id, "customers");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });
    const body = await req.json();
    const customer = await Customer.create({ ...body, organizationId: user.organizationId });
    return NextResponse.json({ customer }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
