import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getMembership } from "@/lib/business";

/** Money pages are for the owner and managers. Returns the member, or the error response to send. */
export async function moneyGate() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  await connectDB();
  const member = await getMembership(session.user.id);
  if (!member) return { error: NextResponse.json({ error: "No organization" }, { status: 404 }) } as const;
  if (!can(member.role, "manageMoney")) return { error: NextResponse.json({ error: "Only the owner or a manager can see money" }, { status: 403 }) } as const;
  return { member, userId: session.user.id } as const;
}
