import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id).select("-password").lean();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { name, phone, image, currentPassword, newPassword } = await req.json();

    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
      if (!user.password) return NextResponse.json({ error: "No password set (OAuth account)" }, { status: 400 });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      user.password = await bcrypt.hash(newPassword, 12);
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (image !== undefined) user.image = image;

    await user.save();
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
