import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { can, getMembership } from "@/lib/business";
import { normalizePlate } from "@/lib/plates";
import { purchaseNumber, salePrice } from "@/lib/purchases";
import { ensurePurchaseCustomer, finishSale } from "@/lib/saleItems";
import { sendChatMessage, triggerPusher } from "@/lib/support";

type Member = NonNullable<Awaited<ReturnType<typeof getMembership>>>;
type SaleDoc = NonNullable<Awaited<ReturnType<typeof Purchase.findOne>>>;

/** A sale of the caller's business, or why it can't be loaded. */
async function loadSale(userId: string, id: string): Promise<{ sale: SaleDoc; member: Member } | { error: string; status: number }> {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Sale not found", status: 404 };
  const member = await getMembership(userId);
  if (!member) return { error: "No organization", status: 404 };
  const sale = await Purchase.findOne({ _id: id, organizationId: member.organizationId });
  if (!sale) return { error: "Sale not found", status: 404 };
  return { sale, member };
}

/** One sale with the business's details, for the printable sale slip. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const found = await loadSale(session.user.id, id);
    if (!("sale" in found)) return NextResponse.json({ error: found.error }, { status: found.status });
    const [purchase, organization] = await Promise.all([
      Purchase.findById(found.sale._id).populate("createdBy", "name").populate("handledBy", "name").lean(),
      Organization.findById(found.member.organizationId).select("name phone email address city logo").lean(),
    ]);
    return NextResponse.json({ purchase, organization });
  } catch (error) {
    console.error("Business sale GET error:", error);
    return NextResponse.json({ error: "Failed to load the sale" }, { status: 500 });
  }
}

/**
 * Moves a sale along. Body: { action, ... }:
 * - accept { agreedPrice? }: REQUESTED → ACCEPTED (defaults to the offer or asking price)
 * - decline { reason? }: REQUESTED/ACCEPTED → DECLINED
 * - complete { agreedPrice?, plateNumber?, amountPaid? }: ACCEPTED (or REQUESTED) → COMPLETED; tags the listing Sold
 * - payment { status: PENDING | PARTIAL | PAID, amountPaid? }
 * - notes { notes }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const found = await loadSale(session.user.id, id);
    if (!("sale" in found)) return NextResponse.json({ error: found.error }, { status: found.status });
    const { sale, member } = found;
    if (!can(member.role, "manageSales")) return NextResponse.json({ error: "Your role can't manage sales" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const open = sale.status === "REQUESTED" || sale.status === "ACCEPTED";
    const price = (v: unknown) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Math.round(Number(v));
      return Number.isFinite(n) && n >= 1 ? n : NaN;
    };
    const now = new Date();
    let tellBuyer = "";

    if (action === "accept") {
      if (sale.status !== "REQUESTED") return NextResponse.json({ error: "Only new requests can be accepted" }, { status: 400 });
      const agreed = price(body.agreedPrice);
      if (Number.isNaN(agreed)) return NextResponse.json({ error: "Enter the agreed price in PKR" }, { status: 400 });
      sale.agreedPrice = agreed ?? salePrice(sale);
      sale.status = "ACCEPTED";
      sale.acceptedAt = now;
      tellBuyer = `Good news: your purchase request ${purchaseNumber(String(sale._id))} for "${sale.vehicle.title}" was accepted at PKR ${sale.agreedPrice.toLocaleString()}. We'll contact you to arrange payment and handover.`;
    } else if (action === "decline") {
      if (!open) return NextResponse.json({ error: "This sale is already closed" }, { status: 400 });
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
      sale.status = "DECLINED";
      sale.declinedAt = now;
      sale.declineReason = reason || undefined;
      tellBuyer = `Sorry, your purchase request ${purchaseNumber(String(sale._id))} for "${sale.vehicle.title}" was declined.${reason ? ` Reason: ${reason}` : ""}`;
    } else if (action === "complete") {
      if (!open) return NextResponse.json({ error: "This sale is already closed" }, { status: 400 });
      const agreed = price(body.agreedPrice);
      if (Number.isNaN(agreed)) return NextResponse.json({ error: "Enter the final price in PKR" }, { status: 400 });
      if (agreed) sale.agreedPrice = agreed;
      else sale.agreedPrice = salePrice(sale);
      if (body.plateNumber) {
        const plate = normalizePlate(body.plateNumber);
        if (!plate) return NextResponse.json({ error: "Enter a valid number plate, e.g. LEA-1234" }, { status: 400 });
        sale.plateNumber = plate;
      }
      if (body.amountPaid !== undefined && body.amountPaid !== "") {
        const paid = Math.round(Number(body.amountPaid));
        if (!Number.isFinite(paid) || paid < 0 || paid > sale.agreedPrice) return NextResponse.json({ error: "The amount paid must be between 0 and the sale price" }, { status: 400 });
        sale.amountPaid = paid;
      }
      sale.status = "COMPLETED";
      sale.completedAt = now;
      sale.acceptedAt ??= now;
      tellBuyer = `Your purchase ${purchaseNumber(String(sale._id))} of "${sale.vehicle.title}" is complete. Congratulations! Your sale slip is in My purchases.`;
    } else if (action === "payment") {
      if (sale.status === "DECLINED" || sale.status === "CANCELLED") return NextResponse.json({ error: "This sale was closed without a sale" }, { status: 400 });
      const due = salePrice(sale);
      if (body.status === "PAID") sale.amountPaid = due;
      else if (body.status === "PENDING") sale.amountPaid = 0;
      else if (body.status === "PARTIAL") {
        const paid = Math.round(Number(body.amountPaid));
        if (!Number.isFinite(paid) || paid <= 0) return NextResponse.json({ error: "Enter how much the buyer has paid" }, { status: 400 });
        if (paid >= due) return NextResponse.json({ error: `That's the full amount (PKR ${due.toLocaleString()}). Choose Paid instead.` }, { status: 400 });
        sale.amountPaid = paid;
      } else {
        return NextResponse.json({ error: "Choose pending, partly paid or paid" }, { status: 400 });
      }
    } else if (action === "notes") {
      sale.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || undefined : undefined;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    sale.handledBy = new mongoose.Types.ObjectId(session.user.id);
    if (tellBuyer && sale.buyerId) sale.seenByBuyer = false;
    await sale.save();

    if (action === "complete") {
      await finishSale(sale);
      try { await ensurePurchaseCustomer(sale); } catch (e) { console.error("Sale customer sync failed:", e); }
    }
    if (tellBuyer && sale.buyerId) {
      try {
        const me = await User.findById(session.user.id).select("name").lean<{ name?: string }>();
        await sendChatMessage(session.user.id, String(sale.buyerId), tellBuyer, me?.name);
        await triggerPusher(`user-${sale.buyerId}`, "new-notification", { type: "purchase", status: sale.status });
      } catch (e) {
        console.error("Sale notification failed:", e);
      }
    }
    return NextResponse.json({ sale });
  } catch (error) {
    console.error("Business sale PATCH error:", error);
    return NextResponse.json({ error: "Failed to update the sale" }, { status: 500 });
  }
}
