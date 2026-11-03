import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { accountManagersFor } from "@/lib/accountManager";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

/**
 * Dedicated support for Business → Help & support: `{ dedicated: false }` when the business's plan doesn't include
 * it, else `{ dedicated: true, manager: { name } | null }` (null until an admin is assigned). Only the name is shared.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const entry = (await accountManagersFor([session.user.id])).get(session.user.id);
    if (!entry) return NextResponse.json({ dedicated: false });
    return NextResponse.json({ dedicated: true, manager: entry.manager ? { name: entry.manager.name || "Your AutoGO contact" } : null });
  } catch (error) {
    reportError("Account manager GET error:", error);
    return NextResponse.json({ error: "Failed to load your account manager" }, { status: 500 });
  }
}
