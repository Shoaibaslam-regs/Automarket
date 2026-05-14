 import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { connectDB } from "@/lib/mongodb";
import { auth } from "@/lib/auth";

import { Inspection } from "@/models/Inspection";
import { Listing } from "@/models/Listing";

type GeminiReport = {
  make: string;
  model: string;
  year: number | null;
  condition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  damageScore: number;
  estimate: number;
  damages: string[];
  positives: string[];
  summary: string;
};

function clampDamageScore(score: number) {
  return Math.max(0, Math.min(10, Number(score) || 0));
}

async function analyzeWithGemini(
  images: string[]
): Promise<GeminiReport> {
  const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!
  );

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const imageParts = await Promise.all(
    images.slice(0, 4).map(async (url: string) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }

      const buffer = await response.arrayBuffer();

      const mimeType =
        response.headers.get("content-type") ||
        "image/jpeg";

      return {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType,
        },
      };
    })
  );

  const prompt = `
You are a professional automobile inspection AI in Pakistan.

Analyze the provided car images carefully.

Inspect:
- dents
- scratches
- paint condition
- bumper damage
- headlights
- body panels
- exterior condition

IMPORTANT RULES:
- Do NOT hallucinate damage.
- Mention only visually confident observations.
- If something is unclear, say "not clearly visible".
- Focus only on visible exterior condition.

Return ONLY valid JSON.
No markdown.
No explanation.

{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "condition": "GOOD",
  "damageScore": 3,
  "estimate": 3500000,
  "damages": ["Minor bumper scratches"],
  "positives": ["Clean exterior"],
  "summary": "Vehicle appears in good condition overall."
}
`;

  const result = await model.generateContent([
    prompt,
    ...imageParts,
  ]);

  const text = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid AI JSON response");
  }

  if (
    !parsed.make ||
    !parsed.model ||
    !parsed.condition
  ) {
    throw new Error("Incomplete AI response");
  }

  return {
    make: parsed.make || "Unknown",
    model: parsed.model || "Unknown",
    year: parsed.year || null,
    condition: parsed.condition || "GOOD",
    damageScore: clampDamageScore(
      parsed.damageScore
    ),
    estimate: Number(parsed.estimate) || 0,
    damages: Array.isArray(parsed.damages)
      ? parsed.damages
      : [],
    positives: Array.isArray(parsed.positives)
      ? parsed.positives
      : [],
    summary:
      parsed.summary ||
      "Vehicle inspection completed.",
  };
}

function generateDemoReport(listing: {
  make: string;
  model: string;
  year: number;
  condition: string;
  mileage?: number;
}): GeminiReport & { _isDemo: boolean } {
  const currentYear = new Date().getFullYear();

  const conditionMap: Record<
    string,
    { score: number; condition: GeminiReport["condition"] }
  > = {
    NEW: {
      score: 0,
      condition: "EXCELLENT",
    },
    EXCELLENT: {
      score: 1,
      condition: "EXCELLENT",
    },
    GOOD: {
      score: 3,
      condition: "GOOD",
    },
    FAIR: {
      score: 6,
      condition: "FAIR",
    },
    POOR: {
      score: 8,
      condition: "POOR",
    },
  };

  const selected =
    conditionMap[listing.condition] ||
    conditionMap.GOOD;

  const basePrice =
    listing.make === "Toyota"
      ? 3500000
      : listing.make === "Honda"
      ? 3200000
      : listing.make === "Suzuki"
      ? 2000000
      : listing.make === "BMW"
      ? 8000000
      : 2500000;

  const yearFactor = Math.max(
    0.5,
    1 - (currentYear - listing.year) * 0.05
  );

  const estimate = Math.round(
    basePrice *
      yearFactor *
      (1 - selected.score * 0.05)
  );

  return {
    make: listing.make,
    model: listing.model,
    year: listing.year,
    condition: selected.condition,
    damageScore: selected.score,
    estimate,

    damages:
      selected.score > 5
        ? [
            "Minor scratches on bumper",
            "Small dent on rear panel",
            "Paint wear visible",
          ]
        : selected.score > 2
        ? [
            "Minor cosmetic scratches",
            "Normal exterior wear",
          ]
        : ["No significant damage detected"],

    positives: [
      "Exterior appears maintained",
      "Body alignment looks proper",
      listing.mileage &&
      listing.mileage < 50000
        ? "Low mileage vehicle"
        : "Regular usage condition",
    ],

    summary: `This ${listing.year} ${listing.make} ${listing.model} appears in ${selected.condition.toLowerCase()} condition. Estimated market value in Pakistan is approximately PKR ${estimate.toLocaleString()}.`,

    _isDemo: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const listingId = body.listingId;
    const images = body.images;

    if (
      !listingId ||
      !Array.isArray(images) ||
      images.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Listing ID and images are required",
        },
        { status: 400 }
      );
    }

    const listing = await Listing.findById(
      listingId
    );

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (
      listing.sellerId.toString() !==
      session.user.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    let report;
    let isDemo = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        report = await analyzeWithGemini(images);
      } catch (error) {
        console.error(
          "Gemini failed. Using demo report:",
          error
        );

        report = generateDemoReport({
          make: listing.make,
          model: listing.model,
          year: listing.year,
          condition: listing.condition,
          mileage: listing.mileage,
        });

        isDemo = true;
      }
    } else {
      report = generateDemoReport({
        make: listing.make,
        model: listing.model,
        year: listing.year,
        condition: listing.condition,
        mileage: listing.mileage,
      });

      isDemo = true;
    }

    const inspection =
      await Inspection.findOneAndUpdate(
        { listingId },

        {
          listingId,
          images,

          make: report.make,
          model: report.model,
          year: report.year,

          condition: report.condition,
          damageScore: report.damageScore,
          estimate: report.estimate,

          rawResponse: report,
        },

        {
          upsert: true,
          new: true,
        }
      );

    return NextResponse.json({
      success: true,
      inspection,
      report,
      isDemo,
    });
  } catch (error: unknown) {
    console.error(
      "AI inspection error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Inspection failed",
      },
      { status: 500 }
    );
  }
}