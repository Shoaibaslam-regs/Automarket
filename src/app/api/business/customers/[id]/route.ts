import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { auth } from "@/lib/auth";
import { can, getMembership } from "@/lib/business";
import { isClosedDeal, pickCustomerFields } from "@/lib/customers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "editCustomers")) {
      return NextResponse.json({ error: "Your role can't edit customers" }, { status: 403 });
    }
    const fields = pickCustomerFields(await req.json().catch(() => null));
    if (fields.name === "" || fields.phone === "") {
      return NextResponse.json({ error: "Name and phone can't be empty" }, { status: 400 });
    }
    const customer = await Customer.findOneAndUpdate(
      { _id: id, organizationId: member.organizationId },
      { $set: fields },
      { new: true, runValidators: true }
    );
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

/** Only the business owner can delete a customer, and only once the deal is closed (sold or lost). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "deleteCustomers")) {
      return NextResponse.json({ error: "Only the business owner can delete customers" }, { status: 403 });
    }
    const customer = await Customer.findOne({ _id: id, organizationId: member.organizationId }).select("status");
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!isClosedDeal(customer.status)) {
      return NextResponse.json({ error: "Mark the deal as Sold or Lost before deleting this customer" }, { status: 400 });
    }
    await customer.deleteOne();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
