import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getMembership, getOrgUserIds } from "@/lib/business";
import { sponsoredPreview } from "@/lib/sponsored";
import { adPreviewTips } from "@/lib/ads";
import { reportError } from "@/lib/errorLog";

/**
 * Business → Promote's preview: GET ?kind=SHOP|DEAL|LISTING&targetId= returns the sponsored card an ad for it would
 * show (built like the live ads, nothing saved) and the tips for it. Only the business's own live deals and its
 * team's active vehicles; anything else is 404.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No business found" }, { status: 403 });
    const kind = req.nextUrl.searchParams.get("kind");
    if (kind !== "SHOP" && kind !== "DEAL" && kind !== "LISTING") return NextResponse.json({ error: "Choose what to promote" }, { status: 400 });
    const targetId = req.nextUrl.searchParams.get("targetId") || undefined;
    const sellerIds = kind === "LISTING" ? await getOrgUserIds(member.organizationId) : [];
    const preview = await sponsoredPreview(member.organizationId, sellerIds, kind, targetId);
    if (!preview) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { item: preview.item, tips: adPreviewTips(preview.facts, targetId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    reportError("Business ad preview error:", error);
    return NextResponse.json({ error: "Failed to load the preview" }, { status: 500 });
  }
}
