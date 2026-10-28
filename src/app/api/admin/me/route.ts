import { NextResponse } from "next/server";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** The signed-in admin's role (FULL or MANAGER) and whether they are the platform owner, so the admin UI can hide what they can't do. */
export async function GET() {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ access: gate.admin.adminAccess, owner: isPlatformOwner(gate.admin.email) });
}
