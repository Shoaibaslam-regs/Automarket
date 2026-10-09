import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** The signed-in admin's access level, so the admin UI can hide actions a view-only admin can't take. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ access: gate.admin.adminAccess });
}
