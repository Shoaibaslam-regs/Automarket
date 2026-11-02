import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { approveFuelUpdate, rejectFuelUpdate } from "@/lib/fuelAdmin";
import { reportError } from "@/lib/errorLog";

type Params = { params: Promise<{ id: string }> };

/**
 * Reviews a release: { action: "approve", petrol?, diesel?, effectiveDate?, note? } (corrections are checked again
 * on the server) or { action: "reject", note? }. A release already reviewed gets 409.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireAdminApi("announcements");
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) ?? {};
    const r = body.action === "approve" ? await approveFuelUpdate(id, gate.admin, body)
      : body.action === "reject" ? await rejectFuelUpdate(id, gate.admin, body.note)
      : { ok: false as const, status: 400, error: "Unknown action" };
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ update: r.update });
  } catch (error) {
    reportError("Admin fuel PATCH error:", error);
    return NextResponse.json({ error: "Failed to review the release" }, { status: 500 });
  }
}
