import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

// Brand typefaces — change here if the official Questivity brand guide specifies others (see BRAND.md).
const body = Open_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: brand.product, template: `%s · ${brand.product}` },
  description: `${brand.company} employee learning, knowledge base and AI assistant.`,
  robots: { index: false, follow: false }, // internal platform — keep out of search engines
};

export const viewport: Viewport = { themeColor: "#072E57" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
