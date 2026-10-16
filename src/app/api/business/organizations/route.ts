import { NextRequest, NextResponse } from "next/server";
import { FollowUp } from "@/models/FollowUp";
import { LedgerEntry } from "@/models/LedgerEntry";
import { BusinessLog } from "@/models/BusinessLog";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";
import { Customer } from "@/models/Customer";
import { auth } from "@/lib/auth";
import { getSubscription } from "@/lib/subscription";
import { getMembership } from "@/lib/business";
import { isUploadedImageUrl } from "@/lib/uploadUrls";
import { invalidateBusinessSlug, invalidateDeal } from "@/lib/pageCache";
import { Deal } from "@/models/Deal";
import { BusinessReview } from "@/models/BusinessReview";
import { Purchase } from "@/models/Purchase";
import { logBusinessAction } from "@/lib/businessLog";

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
    const org = await Organization.findById(user.organizationId).lean();
    if (!org) return NextResponse.json({ organization: null });
    // Plans live on the owner's account; report the one in force rather than the legacy org field
    const sub = await getSubscription(session.user.id);
    // The caller's role lets the settings page show only what they may change
    const member = await getMembership(session.user.id);
    return NextResponse.json({ organization: { ...org, plan: sub.planId }, myRole: member?.role ?? null });
  } catch (error) {
    console.error("Get org error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { name, type, phone, email, city, address, description, followOfficial } = await req.json();
    if (!name || !type || !city) return NextResponse.json({ error: "Name, type and city are required" }, { status: 400 });

    const existing = await User.findById(session.user.id);
    if (existing?.organizationId) return NextResponse.json({ error: "You already have a business" }, { status: 400 });

    const org = await Organization.create({
      name, type, phone, email, city, address, description,
      slug: generateSlug(name),
      ownerId: session.user.id,
      isActive: true,
      // Chosen at registration: follow AutoMarket Official for announcements, updates and offers
      ...(followOfficial === true ? { followsOfficial: true, followedOfficialAt: new Date() } : {}),
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
    const body = (await req.json().catch(() => null)) ?? {};
    // Only fields actually sent are changed, so the logo can be saved on its own
    const update: Record<string, unknown> = {};
    for (const key of ["name", "phone", "email", "city", "address", "description"] as const) {
      if (typeof body[key] === "string") update[key] = body[key];
    }
    if (update.name !== undefined && !String(update.name).trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }
    if (body.logo !== undefined) {
      const member = await getMembership(session.user.id);
      if (!member || !["OWNER", "MANAGER"].includes(member.role)) {
        return NextResponse.json({ error: "Only the owner or a manager can change the business picture" }, { status: 403 });
      }
      if (body.logo !== "" && !isUploadedImageUrl(body.logo)) {
        return NextResponse.json({ error: "Upload the picture here first" }, { status: 400 });
      }
    }
    const removeLogo = body.logo === "";
    if (body.logo && !removeLogo) update.logo = body.logo;
    const org = await Organization.findByIdAndUpdate(
      user.organizationId,
      removeLogo ? { $set: update, $unset: { logo: "" } } : { $set: update },
      { new: true }
    );
    if (org) {
      invalidateBusinessSlug(org.slug);
      const changed = [...Object.keys(update), ...(removeLogo ? ["logo removed"] : [])];
      await logBusinessAction({ userId: session.user.id, organizationId: org._id }, "business.settings",
        { type: "BUSINESS", id: org._id, label: org.name }, { details: changed.join(", ") || undefined });
    }
    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Update org error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
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
    // Its deals and reviews belong to the business and go with it
    await Deal.deleteMany({ organizationId: org._id });
    await Purchase.deleteMany({ organizationId: org._id });
    await BusinessReview.deleteMany({ organizationId: org._id });
    await Promise.all([FollowUp, LedgerEntry, BusinessLog].map(M => (M as typeof FollowUp).deleteMany({ organizationId: org._id })));
    await User.updateMany(
      { organizationId: org._id },
      { $unset: { organizationId: "", organizationRole: "" } }
    );
    await Organization.findByIdAndDelete(org._id);
    invalidateBusinessSlug(org.slug);
    await invalidateDeal(null, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete org error:", error);
    return NextResponse.json({ error: "Failed to delete business" }, { status: 500 });
  }
}
