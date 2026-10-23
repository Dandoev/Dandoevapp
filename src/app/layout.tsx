import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DandoEv - Ride Electric, Pay Smart | E-Bike BNPL Nigeria",
  description: "Nigeria's premier electric bike marketplace with flexible Buy Now, Pay Later options. Browse, finance, and ride electric bikes with ease.",
  keywords: "electric bikes, e-bikes, BNPL, buy now pay later, Nigeria, DandoEv",
};

import MobileNav from "@/components/layout/MobileNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className} style={{ paddingBottom: '80px' }}> {/* Padding for mobile nav */}
        {children}
        <MobileNav />
      </body>
    </html>
  );
}
