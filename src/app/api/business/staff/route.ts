import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
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
    const staff = await Employee.find({ organizationId: user.organizationId })
      .populate("userId", "name email phone image")
      .lean();
    return NextResponse.json({ staff });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const { email, role } = await req.json();
    const targetUser = await User.findOne({ email });
    if (!targetUser) return NextResponse.json({ error: "No AutoMarket account found with this email" }, { status: 404 });
    const existing = await Employee.findOne({ organizationId: user.organizationId, userId: targetUser._id });
    if (existing) return NextResponse.json({ error: "This user is already a staff member" }, { status: 400 });
    const overLimit = await checkPlanLimit(session.user.id, "staff");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });
    const employee = await Employee.create({
      organizationId: user.organizationId,
      userId: targetUser._id,
      role: role || "STAFF",
    });
    await User.findByIdAndUpdate(targetUser._id, {
      organizationId: user.organizationId,
      organizationRole: role || "STAFF",
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
