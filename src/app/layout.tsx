 import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import "@uploadthing/react/styles.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoMarket — Buy, Sell & Rent Vehicles",
  description: "Pakistan's premier automobile marketplace",
  icons: {
    icon: "/favicon.ico"
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