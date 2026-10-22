import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";
import { FollowUp } from "@/models/FollowUp";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

type Member = NonNullable<Awaited<ReturnType<typeof getMembership>>>;
type Doc = NonNullable<Awaited<ReturnType<typeof FollowUp.findOne>>>;

async function load(userId: string, id: string): Promise<{ followUp: Doc; member: Member } | { error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Follow-up not found", status: 404 };
  const member = await getMembership(userId);
  if (!member) return { error: "No organization", status: 404 };
  if (!can(member.role, "editCustomers")) return { error: "Your role can't change follow-ups", status: 403 };
  const followUp = await FollowUp.findOne({ _id: id, organizationId: member.organizationId });
  if (!followUp) return { error: "Follow-up not found", status: 404 };
  return { followUp, member };
}

/** Marks a follow-up done or open again: { done: boolean }, or moves it: { dueAt }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const found = await load(session.user.id, id);
    if (!("followUp" in found)) return NextResponse.json({ error: found.error }, { status: found.status });
    const { followUp, member } = found;

    const body = await req.json().catch(() => ({}));
    if (body.dueAt !== undefined) {
      const due = new Date(body.dueAt);
      if (isNaN(due.getTime())) return NextResponse.json({ error: "Choose a date" }, { status: 400 });
      followUp.dueAt = due;
    }
    if (typeof body.done === "boolean") {
      followUp.doneAt = body.done ? new Date() : undefined;
      followUp.doneBy = body.done ? new mongoose.Types.ObjectId(session.user.id) : undefined;
    }
    await followUp.save();
    if (body.done === true) {
      await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, "customer.followupDone",
        { type: "CUSTOMER", id: followUp.customerId, label: followUp.customerName }, { details: followUp.note });
    }
    return NextResponse.json({ followUp });
  } catch (error) {
    reportError("Follow-up PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the follow-up" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const found = await load(session.user.id, id);
    if (!("followUp" in found)) return NextResponse.json({ error: found.error }, { status: found.status });
    await found.followUp.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Follow-up DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete the follow-up" }, { status: 500 });
  }
}
