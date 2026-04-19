import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { Inspection } from "@/models/Inspection";
import { auth } from "@/lib/auth";
import mongoose from "mongoose"; 
import ImageGallery from "@/components/ui/ImageGallery";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();

  const listing = await Listing.findById(id)
    .populate("sellerId", "name email image phone")
    .lean();

  if (!listing) notFound();

  const l = listing as mongoose.Document & {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    price: number;
    make: string;
    model: string;
    year: number;
    mileage?: number;
    fuelType?: string;
    transmission?: string;
    color?: string;
    location: string;
    condition: string;
    images: string[];
    type: string;
    sellerId: {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      email?: string;
      phone?: string;
    } | null;
  };

  const rental = await Rental.findOne({ listingId: id }).lean() as {
    _id: mongoose.Types.ObjectId;
    dailyRate: number;
    weeklyRate?: number;
    monthlyRate?: number;
    deposit: number;
  } | null;

  const inspection = await Inspection.findOne({ listingId: id }).lean() as {
    make?: string;
    model?: string;
    year?: number;
    condition?: string;
    damageScore?: number;
    estimate?: number;
  } | null;

  const session = await auth();
  const isOwner = session?.user?.id === l.sellerId?._id?.toString();

  const specs = [
    { label: "Condition", value: l.condition },
    { label: "Mileage", value: l.mileage ? `${l.mileage.toLocaleString()} km` : "N/A" },
    { label: "Fuel type", value: l.fuelType ?? "N/A" },
    { label: "Transmission", value: l.transmission ?? "N/A" },
    { label: "Color", value: l.color ?? "N/A" },
    { label: "Location", value: l.location },
  ];

  const inspectionSpecs = inspection ? [
    { label: "Detected make", value: inspection.make },
    { label: "Detected model", value: inspection.model },
    { label: "Estimated year", value: inspection.year?.toString() },
    { label: "Condition", value: inspection.condition },
    { label: "Damage score", value: inspection.damageScore != null ? `${inspection.damageScore}/10` : null },
    { label: "Estimated value", value: inspection.estimate ? `PKR ${inspection.estimate.toLocaleString()}` : null },
  ].filter((s): s is { label: string; value: string } => s.value != null) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">

            {/* Images */}
            {/* <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="relative h-80">
                {l.images?.[0] ? (
                  <Image
                    src={l.images[0]}
                    alt={l.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                    No image available
                  </div>
                )}
              </div>
              {l.images?.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {l.images.slice(1).map((img, i) => (
                    <div key={i} className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div> */}
{/* Images */}
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <ImageGallery images={l.images ?? []} title={l.title} />
</div>
            {/* Title + price */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{l.title}</h1>
                  <p className="text-gray-500 mt-1">{l.make} {l.model} · {l.year}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">PKR {l.price.toLocaleString()}</p>
                  {rental && (
                    <p className="text-sm text-green-600 mt-1">PKR {rental.dailyRate.toLocaleString()}/day</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <p className="text-xs text-gray-400">{spec.label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>

            {/* AI Inspection */}
            {inspection && inspectionSpecs.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">AI inspection report</h2>
                <div className="grid grid-cols-2 gap-4">
                  {inspectionSpecs.map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">

            {/* Seller */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Seller</h2>
              {l.sellerId ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {l.sellerId.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{l.sellerId.name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-400">{l.sellerId.email ?? ""}</p>
                    </div>
                  </div>
                  {l.sellerId.phone && (
                    <a href={`tel:${l.sellerId.phone}`}
                      className="mt-4 w-full block text-center py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                      Call seller
                    </a>
                  )}
                  
                    <a href={`https://wa.me/${l.sellerId.phone?.replace(/\D/g, "")}?text=Hi, I'm interested in: ${l.title}`}
                    target="_blank" rel="noreferrer"
                    className="mt-2 w-full block text-center py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition">
                    WhatsApp
                  </a>
                </>
              ) : (
                <p className="text-sm text-gray-400">Seller info unavailable</p>
              )}
            </div>

            {/* Rental */}
            {rental && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Rental rates</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily</span>
                    <span className="font-medium">PKR {rental.dailyRate.toLocaleString()}</span>
                  </div>
                  {rental.weeklyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Weekly</span>
                      <span className="font-medium">PKR {rental.weeklyRate.toLocaleString()}</span>
                    </div>
                  )}
                  {rental.monthlyRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Monthly</span>
                      <span className="font-medium">PKR {rental.monthlyRate.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Security deposit</span>
                    <span className="font-medium">PKR {rental.deposit.toLocaleString()}</span>
                  </div>
                </div>
                {!isOwner && session?.user && (
                  <Link href={`/rentals/${l._id}/book`}
                    className="mt-4 w-full block text-center py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition">
                    Book now
                  </Link>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage listing</h2>
                <div className="space-y-2">
                  <Link href={`/sell/edit/${l._id}`}
                    className="w-full block text-center py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition">
                    Edit listing
                  </Link>
                  <Link href={`/listings/${l._id}/inspect`}
                    className="w-full block text-center py-2 border border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition">
                    Run AI inspection
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
