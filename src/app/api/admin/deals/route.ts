import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { Deal } from "@/models/Deal";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/** Every deal on the platform with its business, newest ending first. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const deals = await Deal.find()
      .sort({ endsAt: -1 })
      .populate("organizationId", "name slug city")
      .populate("createdBy", "name email")
      .lean();
    return NextResponse.json({ deals });
  } catch (error) {
    reportError("Admin deals GET error:", error);
    return NextResponse.json({ error: "Failed to load deals" }, { status: 500 });
  }
}
