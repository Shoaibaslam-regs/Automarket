import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { Customer } from "@/models/Customer";
import { FollowUp } from "@/models/FollowUp";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

/** Open follow-ups for the whole team, soonest first (`?done=1` for the last 50 finished ones). */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const done = req.nextUrl.searchParams.get("done") === "1";
    const followUps = await FollowUp.find({ organizationId: member.organizationId, doneAt: done ? { $exists: true } : { $exists: false } })
      .sort(done ? { doneAt: -1 } : { dueAt: 1 })
      .limit(done ? 50 : 300)
      .populate("createdBy", "name")
      .lean();
    return NextResponse.json({ followUps, canEdit: can(member.role, "editCustomers") });
  } catch (error) {
    reportError("Follow-ups GET error:", error);
    return NextResponse.json({ error: "Failed to load follow-ups" }, { status: 500 });
  }
}

/** Adds a follow-up: { customerId, dueAt (ISO), note }. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "editCustomers")) return NextResponse.json({ error: "Your role can't add follow-ups" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (!mongoose.Types.ObjectId.isValid(String(body.customerId))) return NextResponse.json({ error: "Choose a customer" }, { status: 400 });
    const customer = await Customer.findOne({ _id: body.customerId, organizationId: member.organizationId }).select("name phone").lean<{ _id: mongoose.Types.ObjectId; name: string; phone?: string }>();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    const dueAt = new Date(body.dueAt);
    if (isNaN(dueAt.getTime())) return NextResponse.json({ error: "Choose when to follow up" }, { status: 400 });
    if (dueAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Choose a date within a year" }, { status: 400 });
    const note = String(body.note ?? "").trim().slice(0, 300);
    if (!note) return NextResponse.json({ error: "Write what the follow-up is about" }, { status: 400 });

    // Keeps a runaway list in check; a busy showroom has far fewer open reminders than this
    const open = await FollowUp.countDocuments({ organizationId: member.organizationId, doneAt: { $exists: false } });
    if (open >= 300) return NextResponse.json({ error: "You have 300 open follow-ups. Mark some done first." }, { status: 400 });

    const followUp = await FollowUp.create({
      organizationId: member.organizationId, customerId: customer._id, customerName: customer.name, customerPhone: customer.phone,
      dueAt, note, createdBy: session.user.id,
    });
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "customer.followup",
      { type: "CUSTOMER", id: customer._id, label: customer.name }, { details: note });
    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error) {
    reportError("Follow-ups POST error:", error);
    return NextResponse.json({ error: "Failed to add the follow-up" }, { status: 500 });
  }
}
