import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isPlatformOwner, requireAdminApi } from "@/lib/adminAuth";
import { effectivePlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gate = await requireAdminApi("read");
    if (!gate.ok) return gate.response;
    await connectDB();
    const users = await User.find().sort({ createdAt: -1 })
      .select("name email phone role adminAccess plan planExpiresAt planSource createdAt emailVerified")
      .lean<Array<{ email: string; role: string; adminAccess?: string; plan?: string; planExpiresAt?: Date; planSource?: string }>>();
    return NextResponse.json({
      viewer: { access: gate.admin.adminAccess },
      users: users.map(u => {
        const owner = isPlatformOwner(u.email);
        return {
          ...u,
          isOwner: owner,
          // Admins created before access levels existed have full access
          adminAccess: u.role === "ADMIN" ? (owner ? "FULL" : u.adminAccess ?? "FULL") : undefined,
          effectivePlan: effectivePlanId(u.plan, u.planExpiresAt),
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
