import mongoose from "mongoose";
import { FuelPrice } from "@/models/FuelPrice";
import { FuelPriceUpdate, type IFuelPriceUpdate } from "@/models/FuelPriceUpdate";
import { logAdminAction } from "@/lib/adminLog";
import { invalidateFuel } from "@/lib/pageCache";
import { fuelDate, parseAdminPrices, parseDay, pkDayKey } from "@/lib/fuelPrices";

// Admin → Fuel prices: approving or rejecting a release the checker read, and entering prices by hand. Only these
// functions create approved prices (FuelPrice); every change is logged (Admin → Activity, target type FUEL).

type Admin = { _id: mongoose.Types.ObjectId; email: string };
type Outcome = { ok: true; update: IFuelPriceUpdate } | { ok: false; status: number; error: string };

/** Saves the approved prices for one day, replacing any approved earlier for that day (a correction). */
async function savePrices(p: { petrol: number; diesel: number; effectiveDate: Date }, meta: {
  admin: Admin | null; updateId: mongoose.Types.ObjectId; source: string; notificationUrl?: string; notificationDate?: Date;
}) {
  const now = new Date();
  for (const [fuelType, price] of [["PETROL", p.petrol], ["DIESEL", p.diesel]] as const) {
    await FuelPrice.updateOne(
      { fuelType, effectiveDate: p.effectiveDate },
      meta.admin
        ? { $set: { price, source: meta.source, notificationUrl: meta.notificationUrl, notificationDate: meta.notificationDate, updateId: meta.updateId, approvedBy: meta.admin._id, approvedAt: now, currency: "PKR", unit: "litre", country: "PK" }, $unset: { autoPublished: 1 } }
        : { $set: { price, source: meta.source, notificationUrl: meta.notificationUrl, notificationDate: meta.notificationDate, updateId: meta.updateId, autoPublished: true, approvedAt: now, currency: "PKR", unit: "litre", country: "PK" }, $unset: { approvedBy: 1 } },
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
  await savePrices(p, { admin, updateId: update._id as mongoose.Types.ObjectId, source: /ogra\.org\.pk/i.test(update.notificationUrl) ? "OGRA price publication" : "Petroleum Division press release", notificationUrl: update.notificationUrl, notificationDate: update.notificationDate });
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

type DayOutcome = { ok: true } | { ok: false; status: number; error: string };

/** The approved prices of one effective day ("YYYY-MM-DD"), for editing or removing it. */
async function pricesOfDay(day: string) {
  const date = parseDay(day);
  if (!date) return null;
  const rows = await FuelPrice.find({ effectiveDate: date }).lean<{ fuelType: "PETROL" | "DIESEL"; price: number }[]>();
  if (rows.length === 0) return null;
  const of = (t: "PETROL" | "DIESEL") => rows.find(r => r.fuelType === t)?.price;
  return { date, petrol: of("PETROL"), diesel: of("DIESEL") };
}

/**
 * Corrects a published day: { petrol, diesel, effectiveDate, note? }, checked like any approval. A new effective
 * date moves the day, unless that date already has prices (edit that day instead). The source link is kept.
 */
export async function editFuelDay(day: string, admin: Admin, body: Record<string, unknown>): Promise<DayOutcome> {
  const old = await pricesOfDay(day);
  if (!old) return { ok: false, status: 404, error: "No published prices for that day" };
  const parsed = parseAdminPrices({ ...body, effectiveDate: body.effectiveDate ?? day }, new Date(), false);
  if (!parsed.data) return { ok: false, status: 400, error: parsed.error ?? "Check the prices" };
  const p = parsed.data;
  const moved = p.effectiveDate.getTime() !== old.date.getTime();
  if (moved && (await FuelPrice.exists({ effectiveDate: p.effectiveDate }))) {
    return { ok: false, status: 409, error: `${fuelDate(p.effectiveDate)} already has prices. Edit or remove that day instead.` };
  }
  const now = new Date();
  for (const [fuelType, price] of [["PETROL", p.petrol], ["DIESEL", p.diesel]] as const) {
    await FuelPrice.updateOne(
      { fuelType, effectiveDate: old.date },
      { $set: { price, effectiveDate: p.effectiveDate, approvedBy: admin._id, approvedAt: now }, $unset: { autoPublished: 1 }, $setOnInsert: { source: "Entered by the AutoGO team from the official notification", currency: "PKR", unit: "litre", country: "PK" } },
      { upsert: true }
    );
  }
  invalidateFuel();
  const was = `Petrol ${old.petrol ?? "—"}, Diesel ${old.diesel ?? "—"}${moved ? ` w.e.f. ${fuelDate(old.date)}` : ""}`;
  await logAdminAction(admin, "fuel.edit", { type: "FUEL", label: `Fuel prices w.e.f. ${fuelDate(p.effectiveDate)}` },
    `Petrol ${p.petrol}, Diesel ${p.diesel} (was ${was})${p.note ? ` · ${p.note}` : ""}`);
  return { ok: true };
}

/** Takes a published day off the public page (a wrong date or a release that shouldn't have been approved). */
export async function deleteFuelDay(day: string, admin: Admin, note: unknown): Promise<DayOutcome> {
  const reason = typeof note === "string" ? note.trim().slice(0, 300) : "";
  if (reason.length < 3) return { ok: false, status: 400, error: "Say why these prices are being removed" };
  const old = await pricesOfDay(day);
  if (!old) return { ok: false, status: 404, error: "No published prices for that day" };
  await FuelPrice.deleteMany({ effectiveDate: old.date });
  invalidateFuel();
  await logAdminAction(admin, "fuel.delete", { type: "FUEL", label: `Fuel prices w.e.f. ${fuelDate(old.date)}` },
    `Petrol ${old.petrol ?? "—"}, Diesel ${old.diesel ?? "—"} · ${reason}`);
  return { ok: true };
}

/**
 * Clears Admin → Fuel prices' "Recently reviewed" card: finished reviews (approved, rejected, unchanged) are hidden,
 * not deleted, so the checker doesn't read those releases again and published prices keep their link to the review.
 * Waiting and unreadable releases stay. The Activity log keeps every approval.
 */
export async function clearFuelReviewHistory(admin: Admin) {
  const r = await FuelPriceUpdate.updateMany({ status: { $in: ["APPROVED", "REJECTED", "SKIPPED"] }, hiddenFromTrail: { $ne: true } }, { $set: { hiddenFromTrail: true } });
  await logAdminAction(admin, "fuel.clearHistory", { type: "FUEL", label: "Fuel review history" }, `${r.modifiedCount} entries cleared`);
  return r.modifiedCount;
}

/**
 * Publishes a checked OGRA day without an admin (the checker calls it when autoPublishHold finds nothing to hold).
 * Taken out of PENDING atomically like an approval, so it can't publish twice; returns whether it went live.
 */
export async function publishFuelUpdateAutomatically(id: mongoose.Types.ObjectId): Promise<boolean> {
  const update = await FuelPriceUpdate.findOneAndUpdate(
    { _id: id, status: "PENDING", extractedPetrolPrice: { $ne: null }, extractedDieselPrice: { $ne: null }, effectiveDate: { $ne: null } },
    { $set: { status: "APPROVED", autoPublished: true, reviewedAt: new Date(), reviewNote: "Published automatically from OGRA's publication" } },
    { returnDocument: "after" }
  ).lean<IFuelPriceUpdate>();
  if (!update) return false;
  await savePrices(
    { petrol: update.extractedPetrolPrice!, diesel: update.extractedDieselPrice!, effectiveDate: new Date(update.effectiveDate!) },
    { admin: null, updateId: update._id as mongoose.Types.ObjectId, source: "OGRA price publication", notificationUrl: update.notificationUrl, notificationDate: update.notificationDate }
  );
  return true;
}

/** The approved prices of the latest day before `day`, for autoPublishHold. */
export async function approvedBefore(day: Date): Promise<{ petrol: number | null; diesel: number | null } | null> {
  const rows = await FuelPrice.find({ effectiveDate: { $lt: day } }).sort({ effectiveDate: -1 }).limit(2).lean<{ fuelType: string; price: number; effectiveDate: Date }[]>();
  if (!rows.length) return null;
  const sameDay = rows.filter(r => r.effectiveDate.getTime() === rows[0].effectiveDate.getTime());
  return { petrol: sameDay.find(r => r.fuelType === "PETROL")?.price ?? null, diesel: sameDay.find(r => r.fuelType === "DIESEL")?.price ?? null };
}
