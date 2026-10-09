import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { can, getMembership } from "@/lib/business";

export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds an AutoMarket account to add as a customer, by exact email or full account ID.
 * Exact matches only, so it can't be used to browse users.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "editCustomers")) return NextResponse.json({ error: "Your role can't add customers" }, { status: 403 });

    const q = (new URL(req.url).searchParams.get("q") || "").trim().replace(/^#/, "");
    if (!q) return NextResponse.json({ error: "Enter an email or account ID" }, { status: 400 });

    const user = mongoose.Types.ObjectId.isValid(q) && q.length === 24
      ? await User.findById(q).select("name email phone").lean<{ _id: mongoose.Types.ObjectId; name?: string; email: string; phone?: string }>()
      : await User.findOne({ email: { $regex: `^${escapeRegex(q)}$`, $options: "i" } })
          .select("name email phone")
          .lean<{ _id: mongoose.Types.ObjectId; name?: string; email: string; phone?: string }>();
    if (!user) return NextResponse.json({ error: "No AutoMarket account found. Check the email, or add them as an outside customer." }, { status: 404 });

    return NextResponse.json({ user: { id: user._id.toString(), name: user.name ?? "", email: user.email, phone: user.phone ?? "" } });
  } catch (error) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
