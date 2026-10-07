import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Favorite } from "@/models/Favorite";
import { Listing } from "@/models/Listing";
import { SavedSearch } from "@/models/SavedSearch";
import { filtersToSearchParams, parseFilters } from "@/lib/listingFilters";
import ListingCard from "@/components/listings/ListingCard";
import SavedSearchList, { type SavedSearchView } from "@/components/listings/SavedSearchList";
import type { IListing } from "@/models/Listing";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type ListingWithId = IListing & { _id: string };

export default async function SavedPage() {
  const session = await requireAuth();
  await connectDB();

  const [favorites, searches] = await Promise.all([
    Favorite.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean<{ listingId: unknown }[]>(),
    SavedSearch.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean<
      { _id: unknown; name: string; filters: Record<string, unknown>; emailAlerts: boolean; createdAt: Date }[]
    >(),
  ]);

  // Keep the order the user saved them in; listings deleted since are dropped
  const ids = favorites.map(f => String(f.listingId));
  const docs = await Listing.find({ _id: { $in: ids } }).lean();
  const byId = new Map(docs.map(d => [String(d._id), d]));
  const listings = ids.map(id => byId.get(id)).filter(Boolean) as unknown as ListingWithId[];

  const savedSearches: SavedSearchView[] = searches.map(s => ({
    id: String(s._id),
    name: s.name,
    query: filtersToSearchParams(parseFilters(s.filters ?? {})).toString(),
    emailAlerts: s.emailAlerts,
    createdAt: new Date(s.createdAt).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Your collection</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Saved</h1>

        <section className="mt-8">
          <h2 className="mb-1 text-base font-bold text-slate-900">Saved searches</h2>
          <p className="mb-4 text-sm text-slate-500">We&apos;ll email you when new vehicles match a search with alerts on.</p>
          <SavedSearchList initial={savedSearches} />
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Saved vehicles {listings.length > 0 && <span className="font-medium text-slate-400">({listings.length})</span>}
          </h2>
          {listings.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
                <Heart size={22} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-slate-900">No saved vehicles yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Tap the heart on any listing to keep it here for later.</p>
              <Link href="/listings" className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Browse vehicles
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {listings.map(listing => (
                <ListingCard key={String(listing._id)} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
