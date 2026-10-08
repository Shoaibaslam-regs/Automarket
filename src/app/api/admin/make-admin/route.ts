import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

// Shorter secrets are treated as unset, so a blank or placeholder ADMIN_SECRET can never open this route
const MIN_SECRET_LENGTH = 16;

function secretMatches(given: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || expected.length < MIN_SECRET_LENGTH || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const secret = body?.secret;
  const email = body?.email;

  if (!secretMatches(secret)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate({ email: email.trim() }, { role: "ADMIN" }, { new: true });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ message: `${user.email} is now ADMIN` });
}
