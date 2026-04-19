import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { auth } from "@/lib/auth";
import BookingForm from "@/components/rentals/BookingForm";
import mongoose from "mongoose";

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
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginBottom: "4px" }}>Book this vehicle</h1>
        <p style={{ fontSize: "14px", color: "#57606a", marginBottom: "28px" }}>Select your rental dates and confirm your booking</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>
          <BookingForm
            rentalId={rental._id.toString()}
            listingId={listing._id.toString()}
            dailyRate={rental.dailyRate}
            deposit={rental.deposit}
            availableFrom={rental.availableFrom.toISOString()}
            availableTo={rental.availableTo?.toISOString()}
          />

          {/* Summary card */}
          <div>
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden", position: "sticky", top: "80px" }}>
              <div style={{ height: "160px", background: "#f6f8fa", overflow: "hidden" }}>
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8c959f", fontSize: "13px" }}>No image</div>
                )}
              </div>
              <div style={{ padding: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>{listing.title}</p>
                <p style={{ fontSize: "12px", color: "#57606a", marginBottom: "16px" }}>{listing.make} {listing.model} · {listing.year} · {listing.location}</p>
                <div style={{ borderTop: "1px solid #e1e4e8", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#57606a" }}>Daily rate</span>
                    <span style={{ fontWeight: 600, color: "#0d1117" }}>PKR {rental.dailyRate.toLocaleString()}</span>
                  </div>
                  {rental.weeklyRate && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#57606a" }}>Weekly rate</span>
                      <span style={{ fontWeight: 600, color: "#0d1117" }}>PKR {rental.weeklyRate.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#57606a" }}>Security deposit</span>
                    <span style={{ fontWeight: 600, color: "#0d1117" }}>PKR {rental.deposit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
