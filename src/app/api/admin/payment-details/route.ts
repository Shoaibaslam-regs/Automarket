import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminAuth";
import { SiteSetting } from "@/models/SiteSetting";
import { cleanPaymentDetails } from "@/lib/paymentDetails";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

/** Saves the payment account people pay into. An empty form clears it, which hides the payment card everywhere. */
export async function PUT(req: NextRequest) {
  const gate = await requireAdminApi("settings");
  if (!gate.ok) return gate.response;
  try {
    const details = cleanPaymentDetails(await req.json().catch(() => ({})));
    if (details) {
      await SiteSetting.updateOne({ key: "payment" }, { $set: { value: details, updatedBy: gate.admin._id } }, { upsert: true });
    } else {
      await SiteSetting.deleteOne({ key: "payment" });
    }
    await logAdminAction(gate.admin, "settings.payment", { type: "SETTINGS", label: "Payment details" },
      details ? [details.bankName, details.iban || details.accountNumber, details.jazzcash && "JazzCash", details.easypaisa && "EasyPaisa"].filter(Boolean).join(" · ") : "Cleared");
    return NextResponse.json({ details });
  } catch (error) {
    reportError("Payment details PUT error:", error);
    return NextResponse.json({ error: "Failed to save payment details" }, { status: 500 });
  }
}
