import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";
import { cleanPaymentDetails, type PaymentDetails } from "@/lib/paymentDetails";

/** The payment account admins entered, or null when none is set yet. */
export async function getPaymentDetails(): Promise<PaymentDetails | null> {
  await connectDB();
  const doc = await SiteSetting.findOne({ key: "payment" }).select("value").lean<{ value?: unknown }>();
  return cleanPaymentDetails(doc?.value);
}
