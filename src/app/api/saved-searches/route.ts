import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SavedSearch } from "@/models/SavedSearch";
import { auth } from "@/lib/auth";
import { describeFilters, filtersToSearchParams, hasFilters, parseFilters } from "@/lib/listingFilters";

const MAX_SAVED_SEARCHES = 10;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const searches = await SavedSearch.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ searches });
  } catch (error) {
    console.error("Get saved searches error:", error);
    return NextResponse.json({ error: "Failed to fetch saved searches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const filters = parseFilters(body?.filters ?? {});
    if (!hasFilters(filters)) {
      return NextResponse.json({ error: "Add at least one filter or search term before saving" }, { status: 400 });
    }

    await connectDB();
    // Same filters already saved? Return that one instead of a duplicate
    const key = filtersToSearchParams(filters).toString();
    const existing = await SavedSearch.find({ userId: session.user.id }).lean<{ _id: unknown; filters: object }[]>();
    const duplicate = existing.find(s => filtersToSearchParams(parseFilters(s.filters as Record<string, unknown>)).toString() === key);
    if (duplicate) return NextResponse.json({ search: duplicate, duplicate: true });

    if (existing.length >= MAX_SAVED_SEARCHES) {
      return NextResponse.json(
        { error: `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one to save another.` },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : describeFilters(filters);
    const search = await SavedSearch.create({ userId: session.user.id, name, filters, emailAlerts: body.emailAlerts !== false });
    return NextResponse.json({ search }, { status: 201 });
  } catch (error) {
    console.error("Create saved search error:", error);
    return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
  }
}
