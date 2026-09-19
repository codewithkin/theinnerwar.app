import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono, Newsreader } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import PwaRegistration from "@/components/pwa-registration";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "The Inner War",
  description:
    "Principles from books you already respect, turned into one lesson, one mission and one line of evidence a day.",
};

export const viewport: Viewport = {
  themeColor: "#131110",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${newsreader.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <PwaRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
