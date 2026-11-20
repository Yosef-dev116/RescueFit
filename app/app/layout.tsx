import type { Metadata } from "next";
import { Archivo_Black, Barlow, Courier_Prime } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

/*
 * Three faces, each with one job on a form.
 *
 * Archivo Black stamps the placard masthead and the section numbers.
 * Courier Prime types every figure, code, kg, and day count, because a
 * number on a form is typed. Barlow sets the prose a person reads.
 *
 * next/font serves all three from this app, so there is no request to a
 * font host at runtime.
 */
const placard = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
});

const body = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const typed = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RescueFit: does this donation fit your kitchen?",
  description:
    "RescueFit reads a photo of a donated food delivery and says what the " +
    "kitchen can store and use, what to cook first, and where the surplus " +
    "should go. Built for food rescue agencies in Prince Edward Island.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${placard.variable} ${body.variable} ${typed.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
