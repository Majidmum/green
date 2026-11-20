import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Green Garden — свежие фрукты и овощи в Душанбе",
    template: "%s | Green Garden",
  },
  description:
    "Green Garden: свежие фрукты, овощи, ягоды и зелень с быстрой доставкой по Душанбе.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Green Garden",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#123D2A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
