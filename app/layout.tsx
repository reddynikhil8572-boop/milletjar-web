import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import BrandIntro from "@/components/brand-intro";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Millet Jar | Fresh from Farm to Your Family",
  description:
    "Millet Jar - natural, wholesome millet-based foods. Shop online, pay securely or order on WhatsApp. www.milletjar.in",
  metadataBase: new URL("https://www.milletjar.in"),
  openGraph: {
    title: "Millet Jar | Fresh from Farm to Your Family",
    description: "Wholesome millet-based foods from farm to your family.",
    url: "https://www.milletjar.in",
    siteName: "Millet Jar",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/images/og-logo.jpg",
        width: 1200,
        height: 630,
        alt: "Millet Jar logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Millet Jar | Fresh from Farm to Your Family",
    description: "Wholesome millet-based foods from farm to your family.",
    images: ["/images/og-logo.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1F7C3F",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <CartProvider>
          <BrandIntro />
          <SiteHeader />
          <main className="min-h-[70vh]">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
