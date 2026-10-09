import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { auth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { can, getMembership } from "@/lib/business";
import { pickCustomerFields } from "@/lib/customers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const customers = await Customer.find({ organizationId: member.organizationId })
      .populate("interestedIn", "title make model year price")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      customers,
      // Lets the page show only the actions this role can take; the routes enforce them either way
      permissions: {
        role: member.role,
        canEdit: can(member.role, "editCustomers"),
        canDelete: can(member.role, "deleteCustomers"),
      },
    });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "editCustomers")) {
      return NextResponse.json({ error: "Your role can't add customers" }, { status: 403 });
    }
    const fields = pickCustomerFields(await req.json().catch(() => null));
    if (!fields.name || !fields.phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }
    const overLimit = await checkPlanLimit(session.user.id, "customers");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });
    const customer = await Customer.create({ ...fields, organizationId: member.organizationId });
    return NextResponse.json({ customer }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
