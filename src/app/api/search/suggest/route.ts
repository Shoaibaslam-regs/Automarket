import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import type { Suggestion } from "@/lib/suggest";
import { reportError } from "@/lib/errorLog";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const title = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/**
 * Search-as-you-type for the home and browse search boxes: make + model pairs, cities and matching live
 * listings for `?q=` (2+ characters). Public and cached briefly at the CDN.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  try {
    await connectDB();
    // Each word must match somewhere, so "civic 2020" and "honda civic" both work
    const words = q.split(/\s+/).filter(Boolean).slice(0, 4);
    const rx = words.map(w => new RegExp(escape(w), "i"));
    const active = { status: "ACTIVE" };
    const all = (fields: string[]) => ({ $and: rx.map(r => ({ $or: fields.map(f => ({ [f]: r })) })) });

    const [models, cities, listings] = await Promise.all([
      Listing.aggregate<{ _id: { make: string; model: string }; n: number }>([
        { $match: { ...active, ...all(["make", "model"]) } },
        { $group: { _id: { make: { $toLower: { $trim: { input: "$make" } } }, model: { $toLower: { $trim: { input: "$model" } } } }, n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 4 },
      ]),
      Listing.aggregate<{ _id: string; n: number }>([
        { $match: { ...active, location: rx[0] } },
        { $group: { _id: { $toLower: { $trim: { input: "$location" } } }, n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 2 },
      ]),
      Listing.find({ ...active, ...all(["title", "make", "model", "location"]) })
        .sort({ featured: -1, createdAt: -1 }).limit(4).select("title price type year location").lean<Array<{ _id: unknown; title: string; price: number; type: string; year: number; location: string }>>(),
    ]);

    const suggestions: Suggestion[] = [
      ...models.map(m => ({
        kind: "model" as const, label: `${title(m._id.make)} ${title(m._id.model)}`, sub: `${m.n} listing${m.n !== 1 ? "s" : ""}`,
        make: title(m._id.make), search: title(m._id.model),
        href: `/listings?make=${encodeURIComponent(title(m._id.make))}&search=${encodeURIComponent(title(m._id.model))}`,
      })),
      ...cities.map(c => ({
        kind: "city" as const, label: title(c._id), sub: `${c.n} in this city`, location: title(c._id),
        href: `/listings?location=${encodeURIComponent(title(c._id))}`,
      })),
      ...listings.map(l => ({
        kind: "listing" as const, label: l.title, sub: `PKR ${l.price.toLocaleString()}${l.type === "RENT" ? "/day" : ""} · ${l.location}`,
        href: `/listings/${String(l._id)}`,
      })),
    ];
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } });
  } catch (error) {
    reportError("Search suggest error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
