import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { auth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { can, getBusinessRentals, getMembership } from "@/lib/business";
import { pickCustomerFields } from "@/lib/customers";
import { normalizePhone } from "@/lib/customerSync";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { syncBookingCustomers } from "@/lib/customerSync";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    // Bring renters from bookings made before this sync existed into the list
    await syncBookingCustomers((await getBusinessRentals(session.user.id)).map(r => r._id));
    const customers = await Customer.find({ organizationId: member.organizationId })
      .populate("interestedIn", "title make model year price")
      .populate("assignedTo", "name")
      // Star customers first, then newest
      .sort({ starred: -1, createdAt: -1 }).lean();
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
    const body = await req.json().catch(() => null);
    const fields = pickCustomerFields(body);
    if (!fields.name || !fields.phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Optional link to an AutoMarket account (found through /api/business/customers/lookup)
    let userId: mongoose.Types.ObjectId | undefined;
    if (body?.userId) {
      if (typeof body.userId !== "string" || !mongoose.Types.ObjectId.isValid(body.userId) || !(await User.exists({ _id: body.userId }))) {
        return NextResponse.json({ error: "That AutoMarket account no longer exists" }, { status: 400 });
      }
      userId = new mongoose.Types.ObjectId(body.userId);
    }

    // Same person twice: match on account, then on phone digits
    if (userId) {
      const dup = await Customer.findOne({ organizationId: member.organizationId, userId }).select("name").lean<{ name: string }>();
      if (dup) return NextResponse.json({ error: `${dup.name} is already in your customers` }, { status: 409 });
    }
    const phoneDigits = normalizePhone(String(fields.phone));
    if (phoneDigits) {
      const existing = await Customer.find({ organizationId: member.organizationId }).select("name phone").lean<Array<{ name: string; phone: string }>>();
      const dup = existing.find(c => normalizePhone(c.phone) === phoneDigits);
      if (dup) return NextResponse.json({ error: `${dup.name} already has this phone number in your customers` }, { status: 409 });
    }

    const overLimit = await checkPlanLimit(session.user.id, "customers");
    if (overLimit) return NextResponse.json(overLimit, { status: 403 });
    const customer = await Customer.create({ ...fields, userId, organizationId: member.organizationId });
    return NextResponse.json({ customer }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
