import { Noto_Nastaliq_Urdu } from "next/font/google";
import GuideContent from "./GuideContent";

export const metadata = { title: "Guide: customers and staff" };

// Only downloaded when someone switches to Urdu
const urdu = Noto_Nastaliq_Urdu({ weight: ["400", "700"], preload: false, display: "swap" });

export default function BusinessGuidePage() {
  return <GuideContent urduClassName={urdu.className} />;
}
