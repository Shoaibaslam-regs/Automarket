import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { shopUpdatesFor } from "@/lib/shopFollowServer";
import { reportError } from "@/lib/errorLog";

/** How many new updates the shops this person follows have (for the bell). Opening Notifications clears it. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  try {
    await connectDB();
    return NextResponse.json({ count: (await shopUpdatesFor(session.user.id)).length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    reportError("Shop updates count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
