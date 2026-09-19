import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono, Newsreader } from "next/font/google";

import "../index.css";
import { Providers } from "@/components/providers";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Dispatch", template: "%s · Dispatch" },
  description: "The Inner War newsletter, internal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#131110" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${archivo.variable} ${newsreader.variable} ${jetbrainsMono.variable} bg-charcoal antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
