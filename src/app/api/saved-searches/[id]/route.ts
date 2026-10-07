import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { SavedSearch } from "@/models/SavedSearch";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const update: { emailAlerts?: boolean; name?: string } = {};
    if (typeof body.emailAlerts === "boolean") update.emailAlerts = body.emailAlerts;
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 120);

    await connectDB();
    // Scoped to the owner, so one user can't edit another's searches
    const search = await SavedSearch.findOneAndUpdate({ _id: id, userId: session.user.id }, update, { new: true }).lean();
    if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ search });
  } catch (error) {
    console.error("Update saved search error:", error);
    return NextResponse.json({ error: "Failed to update saved search" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await connectDB();
    const { deletedCount } = await SavedSearch.deleteOne({ _id: id, userId: session.user.id });
    if (!deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete saved search error:", error);
    return NextResponse.json({ error: "Failed to delete saved search" }, { status: 500 });
  }
}
