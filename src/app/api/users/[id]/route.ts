import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import { adminBadgeKind } from "@/lib/adminBadge";

export async function GET(
  req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const user = await User.findById(id).select("name image role adminAccess isSupportAccount").lean() as {
      _id: { toString: () => string };
      name?: string;
      image?: string;
      role?: string;
      adminAccess?: string;
      isSupportAccount?: boolean;
    } | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        _id: user._id.toString(),
        name: user.name || "User",
        image: user.image,
        // Only for the AutoGO team tick (src/lib/adminBadge.ts)
        ...(adminBadgeKind(user) ? { badge: adminBadgeKind(user) } : {}),
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
