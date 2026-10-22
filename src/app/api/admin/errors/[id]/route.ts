import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";
import { ErrorLog } from "@/models/ErrorLog";

/** `{ action: "resolve" | "reopen" }`. A fixed error reopens by itself when it happens again. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi("write");
  if (!gate.ok) return gate.response;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const { action } = await req.json().catch(() => ({}));
    if (action !== "resolve" && action !== "reopen") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    const entry = await ErrorLog.findByIdAndUpdate(id, action === "resolve" ? { $set: { resolvedAt: new Date() } } : { $unset: { resolvedAt: 1 } }, { new: true }).lean<{ where: string; message: string }>();
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (action === "resolve") await logAdminAction(gate.admin, "errors.resolve", { type: "SETTINGS", label: entry.where }, entry.message.slice(0, 200));
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("Admin error PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
