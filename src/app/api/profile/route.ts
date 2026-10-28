import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizePkMobile } from "@/lib/phone";
import { isUploadedImageUrl } from "@/lib/uploadUrls";
import { nextPictureChangeAt, pictureWaitText } from "@/lib/profilePicture";
import { passwordProblem } from "@/lib/password";
import { newSessionKey } from "@/lib/accountTokens";

import { sendPasswordAddedEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { reportError } from "@/lib/errorLog";
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    // Never send secrets back, even hashed ones
    const user = await User.findById(session.user.id)
      .select("-password -resetTokenHash -resetTokenExpires -sessionKey -signupCodeHash -emailVerifyTokenHash -adminKeyHash -adminCodeHash")
      .lean<{ pictureChanges?: number; pictureChangedAt?: Date }>();
    // When the next new picture can be saved (null: now), so the page can say so instead of offering an upload
    const pictureNextChangeAt = user ? nextPictureChangeAt(user.pictureChanges, user.pictureChangedAt) : null;
    // Google sign-ups have no password; the page then offers "Set a password" instead of "Change password"
    const hasPassword = !!(await User.exists({ _id: session.user.id, password: { $exists: true, $nin: [null, ""] } }));
    return NextResponse.json({ user: user && { ...user, pictureNextChangeAt, hasPassword } });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { name, phone, image, currentPassword, newPassword } = (await req.json().catch(() => ({}))) ?? {};

    // Names and numbers show on listings, chats and slips, so they're kept to a sensible size
    if (name !== undefined && name !== "" && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60)) {
      return NextResponse.json({ error: "Your name must be 2 to 60 characters" }, { status: 400 });
    }
    if (phone !== undefined && phone !== "" && (typeof phone !== "string" || !/^[+\d][\d\s-]{6,19}$/.test(phone.trim()))) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    if (newPassword !== undefined && (typeof newPassword !== "string" || newPassword.length > 128)) {
      return NextResponse.json({ error: "Password must be at most 128 characters" }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Accounts made with Google have no password yet: signed in already, they can set a first one without a current one
    const settingFirst = !!newPassword && !user.password;
    if (newPassword) {
      if (!settingFirst) {
        if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
        const valid = await bcrypt.compare(currentPassword, user.password!);
        if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      const weak = passwordProblem(newPassword, { email: user.email, name: user.name });
      if (weak) return NextResponse.json({ error: weak }, { status: 400 });
      user.password = await bcrypt.hash(newPassword, 12);
      // A new session key signs out every other device; this one gets it back below and keeps going
      user.sessionKey = newSessionKey();
    }

    if (name) user.name = name.trim();
    if (phone !== undefined && phone !== user.phone) {
      user.phone = phone ? phone.trim() : phone;
      // A verified tick belongs to a number; editing the number means verifying again
      if (normalizePkMobile(phone) !== user.verifiedPhone) {
        user.verifiedPhone = undefined;
        user.phoneVerifiedAt = undefined;
      }
    }
    // Only a picture uploaded here (or removing it); a Google picture already on the account may stay as it is
    if (image !== undefined && image !== user.image) {
      if (image !== null && image !== "" && !isUploadedImageUrl(image)) {
        return NextResponse.json({ error: "Upload your picture from this page" }, { status: 400 });
      }
      if (image) {
        // A new picture: the first and one more are free, then 30 days, then 6 months between changes.
        // Removing one is always allowed and doesn't reset the wait.
        const waitUntil = nextPictureChangeAt(user.pictureChanges, user.pictureChangedAt);
        if (waitUntil) return NextResponse.json({ error: pictureWaitText(waitUntil), code: "PICTURE_WAIT", waitUntil }, { status: 429 });
        user.pictureChanges = (user.pictureChanges ?? 0) + 1;
        user.pictureChangedAt = new Date();
      }
      user.image = image || undefined;
    }

    await user.save();
    // A first password is a new way into the account, so its owner hears about it
    if (settingFirst) {
      await sendPasswordAddedEmail({ to: user.email, name: user.name, resetLink: `${SITE_URL}/forgot-password` })
        .catch(e => reportError("Password added email failed:", e));
    }
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
        pictureNextChangeAt: nextPictureChangeAt(user.pictureChanges, user.pictureChangedAt),
        // Only after a password change: the page passes it to useSession().update() to stay signed in here
        ...(newPassword ? { sessionKey: user.sessionKey } : {}),
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
