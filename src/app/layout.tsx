import type { Metadata, Viewport } from "next";
import { PT_Sans, Roboto_Slab } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

// Typefaces used on www.questivity.com: PT Sans (body, navigation) and Roboto Slab (headings).
const body = PT_Sans({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body", display: "swap" });
const display = Roboto_Slab({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.product, template: `%s · ${brand.product}` },
  description: `${brand.company} employee learning, knowledge base and AI assistant.`,
  robots: { index: false, follow: false }, // internal platform — keep out of search engines
};

export const viewport: Viewport = { themeColor: "#008C8D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
