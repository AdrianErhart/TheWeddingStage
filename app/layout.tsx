/**
 * Zentrales Root-Layout der Anwendung.
 * Hier werden globale Metadaten, gemeinsame Seitenstruktur und uebergeordnete Wrapper fuer alle Routen definiert.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Wedding Stage",
  description: "Eine Plattform zum Finden, Vergleichen und Buchen von Künstlern für Hochzeiten.",
  icons: {
    icon: [{ url: "/Weddingstage_Favicon_white.svg", type: "image/svg+xml" }],
    shortcut: "/Weddingstage_Favicon_white.svg",
    apple: "/Weddingstage_Favicon_white.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
