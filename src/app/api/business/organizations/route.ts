import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";
import { Customer } from "@/models/Customer";
import { auth } from "@/lib/auth";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ organization: null });
    const org = await Organization.findById(user.organizationId);
    return NextResponse.json({ organization: org });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { name, type, phone, email, city, address, description, plan } = await req.json();
    if (!name || !type || !city) return NextResponse.json({ error: "Name, type and city are required" }, { status: 400 });

    const existing = await User.findById(session.user.id);
    if (existing?.organizationId) return NextResponse.json({ error: "You already have a business" }, { status: 400 });

    const org = await Organization.create({
      name, type, phone, email, city, address, description,
      plan: plan || "FREE",
      slug: generateSlug(name),
      ownerId: session.user.id,
      isActive: true,
    });

    await Employee.create({
      organizationId: org._id,
      userId: session.user.id,
      role: "OWNER",
    });

    await User.findByIdAndUpdate(session.user.id, {
      organizationId: org._id,
      organizationRole: "OWNER",
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    console.error("Create org error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const body = await req.json();
    const { name, phone, email, city, address, description } = body;
    const org = await Organization.findByIdAndUpdate(
      user.organizationId,
      { name, phone, email, city, address, description },
      { new: true }
    );
    return NextResponse.json({ organization: org });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const org = await Organization.findById(user.organizationId);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (String(org.ownerId) !== String(user._id)) {
      return NextResponse.json({ error: "Only the business owner can delete this business" }, { status: 403 });
    }

    const { confirmName } = await req.json();
    if (confirmName !== org.name) {
      return NextResponse.json({ error: "Business name does not match" }, { status: 400 });
    }

    await Customer.deleteMany({ organizationId: org._id });
    await Employee.deleteMany({ organizationId: org._id });
    await User.updateMany(
      { organizationId: org._id },
      { $unset: { organizationId: "", organizationRole: "" } }
    );
    await Organization.findByIdAndDelete(org._id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete org error:", error);
    return NextResponse.json({ error: "Failed to delete business" }, { status: 500 });
  }
}
