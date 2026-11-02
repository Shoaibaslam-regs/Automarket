import mongoose from "mongoose";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate, type IFuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { logAdminAction } from "@/lib/adminLog";
import { invalidateFuel } from "@/lib/pageCache";
import { fuelDate, parseAdminPrices, pkDayKey } from "@/lib/fuelPrices";

// Admin → Fuel prices: approving or rejecting a release the checker read, and entering prices by hand. Only these
// functions create approved prices (FuelPrice); every change is logged (Admin → Activity, target type FUEL).

type Admin = { _id: mongoose.Types.ObjectId; email: string };
type Outcome = { ok: true; update: IFuelPriceUpdate } | { ok: false; status: number; error: string };

/** Saves the approved prices for one day, replacing any approved earlier for that day (a correction). */
async function savePrices(p: { petrol: number; diesel: number; effectiveDate: Date }, meta: {
  admin: Admin; updateId: mongoose.Types.ObjectId; source: string; notificationUrl?: string; notificationDate?: Date;
}) {
  const now = new Date();
  for (const [fuelType, price] of [["PETROL", p.petrol], ["DIESEL", p.diesel]] as const) {
    await FuelPrice.updateOne(
      { fuelType, effectiveDate: p.effectiveDate },
      { $set: { price, source: meta.source, notificationUrl: meta.notificationUrl, notificationDate: meta.notificationDate, updateId: meta.updateId, approvedBy: meta.admin._id, approvedAt: now, currency: "PKR", unit: "litre", country: "PK" } },
      { upsert: true }
    );
  }
  invalidateFuel();
}

/**
 * Approves a waiting (or unreadable) release. The admin may correct the prices or the day; whatever is approved is
 * checked again here, never trusted from the request. Taking the update out of PENDING/FAILED first means two
 * admins pressing Approve at once can't both approve it.
 */
export async function approveFuelUpdate(id: string, admin: Admin, body: Record<string, unknown>): Promise<Outcome> {
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, status: 404, error: "Update not found" };
  const current = await FuelPriceUpdate.findById(id).lean<IFuelPriceUpdate>();
  if (!current) return { ok: false, status: 404, error: "Update not found" };
  const effective = current.effectiveDate ? pkDayKey(new Date(current.effectiveDate)) : undefined;
  const parsed = parseAdminPrices({
    petrol: body.petrol ?? current.extractedPetrolPrice,
    diesel: body.diesel ?? current.extractedDieselPrice,
    effectiveDate: body.effectiveDate ?? effective,
    note: body.note,
  }, new Date(), false);
  if (!parsed.data) return { ok: false, status: 400, error: parsed.error ?? "Check the prices" };
  const p = parsed.data;
  const corrected = p.petrol !== current.extractedPetrolPrice || p.diesel !== current.extractedDieselPrice || p.effectiveDate.getTime() !== current.effectiveDate?.getTime();

  const update = await FuelPriceUpdate.findOneAndUpdate(
    { _id: id, status: { $in: ["PENDING", "FAILED"] } },
    { $set: { status: "APPROVED", effectiveDate: p.effectiveDate, approvedPetrolPrice: p.petrol, approvedDieselPrice: p.diesel, reviewNote: p.note, reviewedBy: admin._id, reviewedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!update) return { ok: false, status: 409, error: "This update was already reviewed" };
  await savePrices(p, { admin, updateId: update._id as mongoose.Types.ObjectId, source: "Petroleum Division press release", notificationUrl: update.notificationUrl, notificationDate: update.notificationDate });
  await logAdminAction(admin, "fuel.approve", { type: "FUEL", id: update._id, label: `Fuel prices w.e.f. ${fuelDate(p.effectiveDate)}` },
    `Petrol ${p.petrol}, Diesel ${p.diesel}${corrected ? " (corrected from the read prices)" : ""}${p.note ? ` · ${p.note}` : ""}`);
  return { ok: true, update };
}

export async function rejectFuelUpdate(id: string, admin: Admin, note: unknown): Promise<Outcome> {
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, status: 404, error: "Update not found" };
  const reason = typeof note === "string" ? note.trim().slice(0, 300) : "";
  const update = await FuelPriceUpdate.findOneAndUpdate(
    { _id: id, status: { $in: ["PENDING", "FAILED"] } },
    { $set: { status: "REJECTED", reviewNote: reason || undefined, reviewedBy: admin._id, reviewedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!update) return { ok: false, status: 409, error: "This update was already reviewed" };
  await logAdminAction(admin, "fuel.reject", { type: "FUEL", id: update._id, label: update.listedDay ? `Release filed ${update.listedDay}` : "Fuel price release" }, reason || undefined);
  return { ok: true, update };
}

/** Prices typed in by an admin, with the link to the official notification (when the release couldn't be read). */
export async function enterFuelPrices(admin: Admin, body: Record<string, unknown>): Promise<Outcome> {
  const parsed = parseAdminPrices(body);
  if (!parsed.data) return { ok: false, status: 400, error: parsed.error ?? "Check the prices" };
  const p = parsed.data;
  const update = await FuelPriceUpdate.create({
    notificationUrl: p.sourceUrl!, method: "MANUAL", status: "APPROVED", effectiveDate: p.effectiveDate,
    extractedPetrolPrice: p.petrol, extractedDieselPrice: p.diesel, approvedPetrolPrice: p.petrol, approvedDieselPrice: p.diesel,
    reviewNote: p.note, reviewedBy: admin._id, reviewedAt: new Date(),
  });
  await savePrices(p, { admin, updateId: update._id as mongoose.Types.ObjectId, source: "Entered by the AutoGO team from the official notification", notificationUrl: p.sourceUrl });
  await logAdminAction(admin, "fuel.manual", { type: "FUEL", id: update._id, label: `Fuel prices w.e.f. ${fuelDate(p.effectiveDate)}` },
    `Petrol ${p.petrol}, Diesel ${p.diesel} · ${p.sourceUrl}${p.note ? ` · ${p.note}` : ""}`);
  return { ok: true, update };
}
