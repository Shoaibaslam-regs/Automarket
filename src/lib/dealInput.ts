import mongoose from "mongoose";
import { VehicleImage } from "@/models/VehicleImage";
import { MAX_DEAL_IMAGES, MAX_PERCENT, dealPrice } from "@/lib/deals";
import { CONDITIONS } from "@/lib/vehicleOptions";

export type DealInput = {
  title: string;
  description?: string;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  condition: string;
  location: string;
  images: string[];
  price: number;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Validates a create or edit request for a stand-alone deal.
 * Photos must have passed the AI vehicle check when a member of this business uploaded them,
 * or already be on the deal being edited.
 */
export async function parseDealInput(
  body: unknown,
  ctx: { memberIds: mongoose.Types.ObjectId[]; existingImages?: string[] }
): Promise<{ data: DealInput } | { error: string }> {
  const b = (body ?? {}) as Record<string, unknown>;

  const title = text(b.title, 200);
  if (title.length < 3 || title.length > 80) return { error: "Give the deal a title of 3 to 80 characters" };
  const description = text(b.description, 2000);

  const make = text(b.make, 40);
  const model = text(b.model, 60);
  if (!make || !model) return { error: "Enter the vehicle's make and model" };
  const year = Number(b.year);
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1950 || year > thisYear + 1) return { error: `Enter a model year from 1950 to ${thisYear + 1}` };
  const mileage = b.mileage === "" || b.mileage == null ? undefined : Number(b.mileage);
  if (mileage !== undefined && (!Number.isFinite(mileage) || mileage < 0)) return { error: "Mileage must be a positive number" };
  const condition = text(b.condition, 20);
  if (!(CONDITIONS as readonly string[]).includes(condition)) return { error: "Choose the vehicle's condition" };
  const location = text(b.location, 60);
  if (!location) return { error: "Choose the city" };

  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 1) return { error: "Enter the normal price in PKR" };
  const discountType = b.discountType;
  if (discountType !== "PERCENT" && discountType !== "AMOUNT") return { error: "Choose a percentage or a fixed amount off" };
  const discountValue = Number(b.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 1) return { error: "Enter a discount" };
  if (discountType === "PERCENT" && (discountValue > MAX_PERCENT || !Number.isInteger(discountValue))) {
    return { error: `Percentage discounts must be a whole number from 1 to ${MAX_PERCENT}` };
  }
  if (discountType === "AMOUNT" && dealPrice(price, { discountType, discountValue }) < 1) {
    return { error: "The discount can't be more than the price" };
  }

  const startsAt = b.startsAt ? new Date(String(b.startsAt)) : new Date();
  const endsAt = new Date(String(b.endsAt));
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return { error: "Choose start and end dates" };
  // An end date means the whole of that day
  endsAt.setHours(23, 59, 59, 999);
  if (endsAt <= startsAt) return { error: "The deal must end after it starts" };

  const images = [...new Set(Array.isArray(b.images) ? b.images.filter((u): u is string => typeof u === "string") : [])];
  if (images.length === 0) return { error: "Add at least one photo of the vehicle" };
  if (images.length > MAX_DEAL_IMAGES) return { error: `Add up to ${MAX_DEAL_IMAGES} photos` };
  const already = new Set(ctx.existingImages ?? []);
  const fresh = images.filter(u => !already.has(u));
  if (fresh.length > 0) {
    const checked = await VehicleImage.countDocuments({ url: { $in: fresh }, userId: { $in: ctx.memberIds } });
    if (checked !== fresh.length) return { error: "Some photos weren't verified as vehicle photos. Please upload them again." };
  }

  return {
    data: {
      title,
      description: description || undefined,
      make,
      model,
      year,
      mileage,
      fuelType: text(b.fuelType, 20) || undefined,
      transmission: text(b.transmission, 20) || undefined,
      color: text(b.color, 30) || undefined,
      condition,
      location,
      images,
      price: Math.round(price),
      discountType,
      discountValue,
      startsAt,
      endsAt,
    },
  };
}
