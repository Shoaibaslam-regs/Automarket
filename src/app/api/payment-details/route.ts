import { NextResponse } from "next/server";
import { getPaymentDetails } from "@/lib/paymentSettings";
import { reportError } from "@/lib/errorLog";

/** The AutoMarket payment account (bank, IBAN, wallets) shown on the pricing page and in the business console. */
export async function GET() {
  try {
    return NextResponse.json({ details: await getPaymentDetails() });
  } catch (error) {
    reportError("Payment details GET error:", error);
    return NextResponse.json({ details: null });
  }
}
