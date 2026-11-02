import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { deleteFuelDay, editFuelDay } from "@/lib/fuelAdmin";
import { reportError } from "@/lib/errorLog";

type Params = { params: Promise<{ date: string }> };

/** Corrects a published day ("YYYY-MM-DD"): { petrol, diesel, effectiveDate, note? }. A taken new date gets 409. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    const { date } = await params;
    const body = (await req.json().catch(() => ({}))) ?? {};
    const r = await editFuelDay(date, gate.admin, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin fuel day PATCH error:", error);
    return NextResponse.json({ error: "Failed to save the prices" }, { status: 500 });
  }
}

/** Removes a published day from the public page: { note } (the reason, required). */
export async function DELETE(req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    const { date } = await params;
    const body = (await req.json().catch(() => ({}))) ?? {};
    const r = await deleteFuelDay(date, gate.admin, body.note);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin fuel day DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove the prices" }, { status: 500 });
  }
}
