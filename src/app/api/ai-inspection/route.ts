import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Inspection } from "@/models/Inspection";
import { Listing } from "@/models/Listing";
import { auth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function analyzeWithGemini(images: string[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const imageParts = await Promise.all(
    images.slice(0, 4).map(async (url: string) => {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = res.headers.get("content-type") || "image/jpeg";
      return { inlineData: { data: base64, mimeType } };
    })
  );

  const prompt = `You are an expert automobile inspector in Pakistan. Analyze these vehicle images and provide a detailed inspection report.

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "make": "detected vehicle make or Unknown",
  "model": "detected vehicle model or Unknown",
  "year": estimated year as number or null,
  "condition": "EXCELLENT" or "GOOD" or "FAIR" or "POOR",
  "damageScore": number from 0 to 10,
  "estimate": estimated market value in PKR as number,
  "damages": ["visible damage 1", "visible damage 2"],
  "positives": ["good feature 1", "good feature 2"],
  "summary": "2-3 sentence overall assessment"
}`;

  const result = await model.generateContent([prompt, ...imageParts]);
  return result.response.text();
}

function generateDemoReport(listing: { make: string; model: string; year: number; condition: string; mileage?: number }) {
  const conditionMap: Record<string, { score: number; condition: string }> = {
    NEW:       { score: 0, condition: "EXCELLENT" },
    EXCELLENT: { score: 1, condition: "EXCELLENT" },
    GOOD:      { score: 3, condition: "GOOD" },
    FAIR:      { score: 6, condition: "FAIR" },
    POOR:      { score: 8, condition: "POOR" },
  };
  const c = conditionMap[listing.condition] || conditionMap.GOOD;
  const basePrice = listing.make === "Toyota" ? 3500000 :
    listing.make === "Honda" ? 3200000 :
    listing.make === "Suzuki" ? 2000000 :
    listing.make === "BMW" ? 8000000 : 2500000;
  const yearFactor = Math.max(0.5, 1 - (2025 - listing.year) * 0.05);
  const estimate = Math.round(basePrice * yearFactor * (1 - c.score * 0.05));

  return {
    make: listing.make,
    model: listing.model,
    year: listing.year,
    condition: c.condition,
    damageScore: c.score,
    estimate,
    damages: c.score > 5
      ? ["Minor scratches on bumper", "Small dent on rear panel", "Windshield has minor chips"]
      : c.score > 2
      ? ["Minor surface scratches", "Slight wear on tires"]
      : ["No significant damage detected"],
    positives: [
      "Engine appears to be in good working condition",
      "Interior is clean and well maintained",
      "Tires have adequate tread depth",
      listing.mileage && listing.mileage < 50000 ? "Low mileage vehicle" : "Regular maintenance evident",
    ],
    summary: `This ${listing.year} ${listing.make} ${listing.model} is in ${c.condition.toLowerCase()} condition with a damage score of ${c.score}/10. ${c.score <= 2 ? "The vehicle shows minimal wear and is well maintained." : c.score <= 5 ? "Some minor cosmetic issues are present but nothing major." : "Several areas need attention before purchase."} Based on current market conditions in Pakistan, the estimated value is PKR ${estimate.toLocaleString()}.`,
    _isDemo: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { listingId, images } = await req.json();

    if (!listingId || !images || images.length === 0) {
      return NextResponse.json({ error: "Listing ID and images are required" }, { status: 400 });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.sellerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let parsed;
    let isDemo = false;

    // Try Gemini if key exists
    if (process.env.GEMINI_API_KEY) {
      try {
        const raw = await analyzeWithGemini(images);
        const clean = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch (err) {
        console.error("Gemini failed, using demo report:", err);
        parsed = generateDemoReport({
          make: listing.make,
          model: listing.model,
          year: listing.year,
          condition: listing.condition,
          mileage: listing.mileage,
        });
        isDemo = true;
      }
    } else {
      parsed = generateDemoReport({
        make: listing.make,
        model: listing.model,
        year: listing.year,
        condition: listing.condition,
        mileage: listing.mileage,
      });
      isDemo = true;
    }

    const inspection = await Inspection.findOneAndUpdate(
      { listingId },
      {
        listingId,
        images,
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        condition: parsed.condition,
        damageScore: parsed.damageScore,
        estimate: parsed.estimate,
        rawResponse: parsed,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ inspection, report: parsed, isDemo });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("AI inspection error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
