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
import { isVerified } from "@/lib/plans";
import { getMembership } from "@/lib/business";
import { isUploadedImageUrl } from "@/lib/uploadUrls";
import { invalidateBusinessSlug, invalidateDeal } from "@/lib/pageCache";
import { Deal } from "@/models/Deal";
import { BusinessReview } from "@/models/BusinessReview";
import { Purchase } from "@/models/Purchase";
import { Ad } from "@/models/Ad";
import { logBusinessAction } from "@/lib/businessLog";
import { reportError } from "@/lib/errorLog";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

/** Business details as sent, trimmed and kept to the sizes the dealer page, slips and cards can show. */
const ORG_TEXT_LIMITS = { name: 80, phone: 20, email: 120, city: 60, address: 200, description: 1000 } as const;
function orgTextFields(body: Record<string, unknown>): { error: string } | Partial<Record<keyof typeof ORG_TEXT_LIMITS, string>> {
  const out: Partial<Record<keyof typeof ORG_TEXT_LIMITS, string>> = {};
  for (const [key, max] of Object.entries(ORG_TEXT_LIMITS) as [keyof typeof ORG_TEXT_LIMITS, number][]) {
    const v = body[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") return { error: `The business ${key} must be text` };
    if (v.trim().length > max) return { error: `The business ${key} can be at most ${max} characters` };
    out[key] = v.trim();
  }
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) return { error: "Enter a valid business email" };
  return out;
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
    // verified: the console shows the Verified tick beside the business name
    return NextResponse.json({ organization: { ...org, plan: sub.planId, verified: isVerified(org.verification) }, myRole: member?.role ?? null });
  } catch (error) {
    reportError("Get org error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = (await req.json().catch(() => null)) ?? {};
    const { type, followOfficial } = body;
    const fields = orgTextFields(body);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
    const { name, phone, email, city, address, description } = fields;
    if (!name || !type || !city) return NextResponse.json({ error: "Name, type and city are required" }, { status: 400 });
    if (!["DEALER", "RENTAL", "BOTH"].includes(type)) return NextResponse.json({ error: "Choose the type of business" }, { status: 400 });

    const existing = await User.findById(session.user.id);
    if (existing?.organizationId) return NextResponse.json({ error: "You already have a business" }, { status: 400 });

    const org = await Organization.create({
      name, type, phone, email, city, address, description,
      slug: generateSlug(name),
      ownerId: session.user.id,
      isActive: true,
      // Chosen at registration: follow AutoGO Official for announcements, updates and offers
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
    reportError("Create org error:", error);
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
    // Business settings are the owner's and managers'; other team members can only look
    const member = await getMembership(session.user.id);
    if (!member || !["OWNER", "MANAGER"].includes(member.role)) {
      return NextResponse.json({ error: "Only the owner or a manager can change the business details" }, { status: 403 });
    }
    // Only fields actually sent are changed, so the logo can be saved on its own
    const fields = orgTextFields(body);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) if (value !== undefined) update[key] = value;
    if ("name" in body && !update.name) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }
    if (body.logo !== undefined) {
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
    reportError("Update org error:", error);
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
    await Promise.all([FollowUp, LedgerEntry, BusinessLog, Ad].map(M => (M as typeof FollowUp).deleteMany({ organizationId: org._id })));
    await User.updateMany(
      { organizationId: org._id },
      { $unset: { organizationId: "", organizationRole: "" } }
    );
    await Organization.findByIdAndDelete(org._id);
    invalidateBusinessSlug(org.slug);
    await invalidateDeal(null, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    reportError("Delete org error:", error);
    return NextResponse.json({ error: "Failed to delete business" }, { status: 500 });
  }
}
