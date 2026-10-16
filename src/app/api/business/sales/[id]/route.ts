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
import { logBusinessAction } from "@/lib/businessLog";
import { recordPaymentChange } from "@/lib/ledger";
import { MAX_INSTALLMENT_MONTHS, buildSchedule, installmentSummary } from "@/lib/installments";

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
 * - installments { downPayment, months, firstDue: "YYYY-MM-DD" }: sets up a monthly plan (replaces one with nothing paid yet)
 * - removeInstallments: drops a plan with no installment paid
 * - payInstallment / unpayInstallment { index }: marks one paid (adds it to amountPaid) or undoes that
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
    } else if (action === "installments") {
      if (sale.status !== "ACCEPTED" && sale.status !== "COMPLETED") return NextResponse.json({ error: "Accept the request or record the sale first" }, { status: 400 });
      if (sale.installmentPlan?.items.some((i: { paidAt?: Date }) => i.paidAt)) return NextResponse.json({ error: "Installments have been paid on this plan, so it can't be replaced" }, { status: 400 });
      const total = salePrice(sale);
      const down = Math.round(Number(body.downPayment ?? 0));
      const months = Math.round(Number(body.months));
      const firstDue = String(body.firstDue ?? "");
      if (!Number.isFinite(down) || down < 0 || down >= total) return NextResponse.json({ error: `The down payment must be less than the price (PKR ${total.toLocaleString()})` }, { status: 400 });
      if (!Number.isInteger(months) || months < 1 || months > MAX_INSTALLMENT_MONTHS) return NextResponse.json({ error: `Choose 1 to ${MAX_INSTALLMENT_MONTHS} months` }, { status: 400 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue) || isNaN(new Date(firstDue).getTime())) return NextResponse.json({ error: "Choose the first installment date" }, { status: 400 });
      sale.installmentPlan = { downPayment: down, months, items: buildSchedule(total, down, months, firstDue).map(i => ({ dueDate: new Date(i.dueDate), amount: i.amount })), createdAt: now };
      // The down payment is taken when the plan starts
      if ((sale.amountPaid ?? 0) < down) sale.amountPaid = down;
    } else if (action === "removeInstallments") {
      if (!sale.installmentPlan) return NextResponse.json({ error: "This sale has no installment plan" }, { status: 400 });
      if (sale.installmentPlan.items.some((i: { paidAt?: Date }) => i.paidAt)) return NextResponse.json({ error: "Installments have been paid on this plan, so it can't be removed" }, { status: 400 });
      sale.installmentPlan = undefined;
    } else if (action === "payInstallment" || action === "unpayInstallment") {
      const item = sale.installmentPlan?.items[Number(body.index)];
      if (!item) return NextResponse.json({ error: "Installment not found" }, { status: 404 });
      const pay = action === "payInstallment";
      if (pay === !!item.paidAt) return NextResponse.json({ error: pay ? "This installment is already paid" : "This installment isn't paid" }, { status: 400 });
      item.paidAt = pay ? now : undefined;
      sale.amountPaid = Math.min(salePrice(sale), Math.max(0, (sale.amountPaid ?? 0) + (pay ? item.amount : -item.amount)));
      sale.markModified("installmentPlan");
    } else if (action === "notes") {
      sale.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || undefined : undefined;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const paidBefore = (await Purchase.findById(sale._id).select("amountPaid").lean<{ amountPaid?: number }>())?.amountPaid ?? 0;
    sale.handledBy = new mongoose.Types.ObjectId(session.user.id);
    if (tellBuyer && sale.buyerId) sale.seenByBuyer = false;
    await sale.save();
    {
      const change = (sale.amountPaid ?? 0) - paidBefore;
      if (change) await recordPaymentChange(session.user.id, change, action === "payInstallment" ? "INSTALLMENT" : "SALE_PAYMENT", { purchaseId: sale._id, listingId: sale.listingId, vehicleLabel: sale.vehicle.title }, `${purchaseNumber(String(sale._id))} · ${sale.buyer.name}`);
      const act = ({ accept: "sale.accept", decline: "sale.decline", complete: "sale.complete", payment: "sale.payment", installments: "sale.installments", payInstallment: "sale.installmentPaid" } as Record<string, string>)[action];
      if (act) {
        const paidNow = sale.amountPaid ?? 0;
        await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, act,
          { type: "SALE", id: sale._id, label: sale.vehicle.title },
          {
            details: action === "payment" ? `PKR ${paidBefore.toLocaleString()} → PKR ${paidNow.toLocaleString()}`
              : action === "installments" ? `${sale.buyer.name} · ${sale.installmentPlan!.months} months × PKR ${sale.installmentPlan!.items[0].amount.toLocaleString()}, down PKR ${sale.installmentPlan!.downPayment.toLocaleString()}`
              : action === "payInstallment" ? `${sale.buyer.name} · ${installmentSummary(sale.installmentPlan)?.paidCount}/${sale.installmentPlan!.months} paid`
              : `${sale.buyer.name}${sale.agreedPrice ? ` · PKR ${sale.agreedPrice.toLocaleString()}` : ""}`,
            amount: action === "complete" ? salePrice(sale) : action === "payment" || action === "payInstallment" ? paidNow - paidBefore : undefined,
          });
      }
    }

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
