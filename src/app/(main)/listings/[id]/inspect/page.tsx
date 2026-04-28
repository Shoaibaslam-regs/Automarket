import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Inspection } from "@/models/Inspection";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import AIInspectionForm from "@/components/inspection/AIInspectionForm";

export default async function InspectPage({
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
    sellerId: mongoose.Types.ObjectId;
  } | null;

  if (!listing) notFound();
  if (listing.sellerId.toString() !== session.user.id) redirect(`/listings/${id}`);

  const existing = await Inspection.findOne({ listingId: id }).lean() as {
    make?: string;
    model?: string;
    year?: number;
    condition?: string;
    damageScore?: number;
    estimate?: number;
    rawResponse?: Record<string, unknown>;
    createdAt: Date;
  } | null;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        <div style={{ marginBottom: "24px" }}>
          <a href={`/listings/${id}`} style={{ fontSize: "13px", color: "#57606a", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "16px" }}>
            ← Back to listing
          </a>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0d1117", marginBottom: "4px" }}>AI vehicle inspection</h1>
          <p style={{ fontSize: "14px", color: "#57606a" }}>
            Upload photos of <strong style={{ color: "#0d1117" }}>{listing.title}</strong> — our AI will analyze damage, identify the vehicle and estimate its value.
          </p>
        </div>

        <AIInspectionForm
          listingId={id}
          listingImages={listing.images}
          existingReport={existing ? {
            make: existing.make,
            model: existing.model,
            year: existing.year,
            condition: existing.condition,
            damageScore: existing.damageScore,
            estimate: existing.estimate,
            rawResponse: existing.rawResponse,
            createdAt: existing.createdAt.toISOString(),
          } : null}
        />
      </div>
    </div>
  );
}
