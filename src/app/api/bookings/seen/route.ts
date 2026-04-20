import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false });
    }
    await connectDB();
    await Booking.updateMany(
      {
        renterId: session.user.id,
        status: { $in: ["CONFIRMED", "CANCELLED"] },
        seenByRenter: { $ne: true },
      },
      { $set: { seenByRenter: true } }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
