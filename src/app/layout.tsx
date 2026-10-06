 import type { Metadata } from "next";
import { Geist } from "next/font/google";
// UploadThing ships its own Tailwind utilities (e.g. `.hidden`); import it before globals.css
// so our responsive variants like `lg:block` aren't overridden by it.
import "@uploadthing/react/styles.css";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoMarket — Buy, Sell & Rent Vehicles",
  description: "Pakistan's premier automobile marketplace",
   icons: {
    icon: "/3+Lines+02.webp"
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}