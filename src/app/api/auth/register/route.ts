import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";
import { clientIp, hitRateLimit, isRateLimited, waitText } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorLog";

export async function POST(req: NextRequest) {
  try {
    // Stops mass sign-ups (and free-trial farming); only successful sign-ups count, 10 per IP an hour
    const ip = clientIp(req);
    const limit = await isRateLimited("register", ip);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many new accounts from this connection. Please try again in ${waitText(limit.retryAfterSec)}.`, code: "RATE_LIMITED", retryAfter: limit.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { name, email, password, phone, acceptTerms } = await req.json();

    if (acceptTerms !== true) {
      return NextResponse.json({ error: "Please accept the Terms & Conditions to create an account" }, { status: 400 });
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "USER",
      termsAcceptedAt: new Date(),
    });
    await hitRateLimit("register", ip);

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    reportError("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}