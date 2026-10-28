import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Block } from "@/models/Block";
import { User } from "@/models/User";
import { rateLimitResponse } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

const valid = (id: unknown): id is string => typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

/** `?with=<userId>`: whether you blocked them and whether they blocked you (for the chat header and reply box). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const other = req.nextUrl.searchParams.get("with");
  if (!valid(other)) return NextResponse.json({ error: "Who?" }, { status: 400 });
  try {
    await connectDB();
    const [mine, theirs] = await Promise.all([
      Block.exists({ blockerId: session.user.id, blockedId: other }),
      Block.exists({ blockerId: other, blockedId: session.user.id }),
    ]);
    return NextResponse.json({ blockedByMe: !!mine, blockedMe: !!theirs });
  } catch (error) {
    reportError("Blocks GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * Blocks someone in Messages. Body: { userId }. Neither side can send a chat message while it lasts; booking and sale
 * updates from a business still arrive. The AutoGO Support account can't be blocked.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimitResponse("blocks", session.user.id, "blocks");
  if (limited) return limited;
  try {
    const { userId } = (await req.json().catch(() => ({}))) ?? {};
    if (!valid(userId) || userId === session.user.id) return NextResponse.json({ error: "You can't block this person" }, { status: 400 });
    await connectDB();
    const other = await User.findById(userId).select("isSupportAccount").lean<{ isSupportAccount?: boolean }>();
    if (!other) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (other.isSupportAccount) return NextResponse.json({ error: "AutoGO Support can't be blocked" }, { status: 400 });
    await Block.updateOne({ blockerId: session.user.id, blockedId: userId }, { $setOnInsert: { blockerId: session.user.id, blockedId: userId } }, { upsert: true });
    return NextResponse.json({ ok: true, blockedByMe: true });
  } catch (error) {
    reportError("Block POST error:", error);
    return NextResponse.json({ error: "Couldn't block" }, { status: 500 });
  }
}

/** Lifts your block. `?userId=` */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = req.nextUrl.searchParams.get("userId");
  if (!valid(userId)) return NextResponse.json({ error: "Who?" }, { status: 400 });
  try {
    await connectDB();
    await Block.deleteOne({ blockerId: session.user.id, blockedId: userId });
    return NextResponse.json({ ok: true, blockedByMe: false });
  } catch (error) {
    reportError("Block DELETE error:", error);
    return NextResponse.json({ error: "Couldn't unblock" }, { status: 500 });
  }
}
