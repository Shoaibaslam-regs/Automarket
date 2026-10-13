import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isPlatformOwner } from "@/lib/adminAuth";
import { checkAccountDeletion, deleteAccount } from "@/lib/accountDeletion";

/** What deleting the signed-in account would remove, and anything that has to be sorted out first. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id).select("email password").lean<{ email: string; password?: string }>();
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const check = await checkAccountDeletion(session.user.id);
    if (isPlatformOwner(user.email)) check.blockers.unshift("The platform owner account can't be deleted.");
    return NextResponse.json({ ...check, email: user.email, hasPassword: !!user.password });
  } catch (error) {
    console.error("Account deletion check error:", error);
    return NextResponse.json({ error: "Failed to check your account" }, { status: 500 });
  }
}

/**
 * Permanently deletes the signed-in account. Body: { confirmEmail, password? }.
 * The email must be typed out, and accounts with a password must enter it.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id).select("email password").lean<{ email: string; password?: string }>();
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const { confirmEmail, password } = await req.json().catch(() => ({}));
    if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Type your email address exactly to confirm" }, { status: 400 });
    }
    if (user.password && (typeof password !== "string" || !(await bcrypt.compare(password, user.password)))) {
      return NextResponse.json({ error: "Your password is incorrect" }, { status: 400 });
    }
    if (isPlatformOwner(user.email)) return NextResponse.json({ error: "The platform owner account can't be deleted." }, { status: 403 });

    const check = await checkAccountDeletion(session.user.id);
    if (check.blockers.length) return NextResponse.json({ error: check.blockers[0], blockers: check.blockers }, { status: 409 });

    await deleteAccount(session.user.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete your account" }, { status: 500 });
  }
}
