import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find().sort({ createdAt: -1 })
      .select("name email phone role createdAt emailVerified").lean();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
