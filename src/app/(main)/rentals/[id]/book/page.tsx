import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { auth } from "@/lib/auth";
import BookingForm from "@/components/rentals/BookingForm";
import mongoose from "mongoose";
import Link from "next/link";
import { ChevronLeft, ImageOff, MapPin } from "lucide-react";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();

  const listing = await Listing.findById(id).lean() as {
    _id: mongoose.Types.ObjectId;
    title: string;
    images: string[];
    make: string;
    model: string;
    year: number;
    location: string;
  } | null;

  if (!listing) notFound();

  const rental = await Rental.findOne({ listingId: id }).lean() as {
    _id: mongoose.Types.ObjectId;
    dailyRate: number;
    weeklyRate?: number;
    monthlyRate?: number;
    deposit: number;
    availableFrom: Date;
    availableTo?: Date;
  } | null;

  if (!rental) notFound();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1000px]">
        <Link href={`/listings/${listing._id.toString()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900">
          <ChevronLeft size={15} strokeWidth={2} /> Back to listing
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Book this vehicle</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500 sm:mb-8">Select your rental dates and confirm your booking</p>

        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Summary card: shown first on mobile so the vehicle is in view, beside the form on desktop */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex gap-3 p-3 lg:block lg:p-0">
                <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:h-auto lg:w-full lg:rounded-none lg:aspect-[16/10]">
                  {listing.images?.[0] ? (
                    <Image src={listing.images[0]} alt={listing.title} fill priority sizes="(max-width: 1024px) 96px, 340px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400"><ImageOff size={20} strokeWidth={1.5} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1 lg:p-5 lg:pb-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{listing.make} · {listing.model} · {listing.year}</p>
                  <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{listing.title}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin size={12} strokeWidth={1.75} className="flex-shrink-0" />{listing.location}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 border-t border-slate-100 px-4 py-4 text-[13px] lg:mx-5 lg:mt-4 lg:px-0 lg:pb-5">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Daily rate</span>
                  <span className="font-semibold text-slate-900">PKR {rental.dailyRate.toLocaleString()}</span>
                </div>
                {rental.weeklyRate && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Weekly rate</span>
                    <span className="font-semibold text-slate-900">PKR {rental.weeklyRate.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Security deposit</span>
                  <span className="font-semibold text-slate-900">PKR {rental.deposit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 lg:order-1">
            <BookingForm
              rentalId={rental._id.toString()}
              listingId={listing._id.toString()}
              dailyRate={rental.dailyRate}
              deposit={rental.deposit}
              availableFrom={rental.availableFrom.toISOString()}
              availableTo={rental.availableTo?.toISOString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
