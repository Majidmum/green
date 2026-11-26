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

// Ставит тему до первой отрисовки: сохранённый выбор или тема системы
const THEME_SCRIPT = `try{var t=localStorage.getItem("gg-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

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
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0C140F" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
