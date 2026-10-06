import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";

export type VehicleCheck = {
  isVehicle: boolean;
  /** e.g. "car", "motorcycle", "rickshaw", "none" */
  vehicleType: string;
  /** Short user-facing explanation, used as the error message when rejected */
  reason: string;
};

// Fast, cheap vision model for a yes/no classification. Override with GEMINI_VISION_MODEL if needed.
const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";

const SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isVehicle: { type: SchemaType.BOOLEAN },
    vehicleType: { type: SchemaType.STRING },
    reason: { type: SchemaType.STRING },
  },
  required: ["isVehicle", "vehicleType", "reason"],
};

const PROMPT = `You moderate photos uploaded to a vehicle marketplace where people sell or rent cars and motorbikes.

Decide whether this photo is acceptable as a listing photo of a real vehicle.

ACCEPT (isVehicle = true) when a real road vehicle is the main subject:
- cars, SUVs, jeeps, vans, pickups, trucks, buses
- motorcycles, scooters, bikes, rickshaws, quad bikes
- close-ups of that vehicle's parts: interior, seats, dashboard, odometer, steering wheel, engine bay, wheels/tyres, lights, damage/dents/scratches on the body

REJECT (isVehicle = false) when:
- there is no vehicle, or a vehicle is only a small background detail
- the main subject is a person/selfie, animal, food, building, landscape, or any unrelated object
- it is a document, screenshot of text, meme, logo, cartoon, hand drawing/sketch, or a toy/model vehicle
- the image is too dark, blurry or corrupted to tell

Realistic photos AND realistic studio/CGI images of a full-size vehicle are fine; do not reject an image just
because it looks professionally edited or rendered.

vehicleType: one word such as "car", "motorcycle", "scooter", "rickshaw", "truck", or "none".
reason: one short sentence a seller would understand, e.g. "This looks like a selfie, not a vehicle." or "Front view of a sedan."`;

export async function checkVehicleImage(data: ArrayBuffer, mimeType: string): Promise<VehicleCheck> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
  });

  const result = await model.generateContent([
    { inlineData: { data: Buffer.from(data).toString("base64"), mimeType } },
    PROMPT,
  ]);

  const parsed = JSON.parse(result.response.text()) as Partial<VehicleCheck>;
  return {
    isVehicle: parsed.isVehicle === true,
    vehicleType: String(parsed.vehicleType || "none"),
    reason: String(parsed.reason || ""),
  };
}

/** Downloads an image by URL and checks it. */
export async function checkVehicleImageUrl(url: string): Promise<VehicleCheck> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return checkVehicleImage(await res.arrayBuffer(), mimeType);
}
