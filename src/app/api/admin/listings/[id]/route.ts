import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { requireAdminApi } from "@/lib/adminAuth";
import { invalidateListingAndSeller } from "@/lib/pageCache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    const body = await req.json();
    await connectDB();
    const listing = await Listing.findByIdAndUpdate(id, body, { new: true });
    if (listing) await invalidateListingAndSeller(id, listing.sellerId);
    return NextResponse.json({ listing });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminApi("write");
    if (!gate.ok) return gate.response;
    const { id } = await params;
    await connectDB();
    const deleted = await Listing.findByIdAndDelete(id);
    if (deleted) await invalidateListingAndSeller(id, deleted.sellerId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
