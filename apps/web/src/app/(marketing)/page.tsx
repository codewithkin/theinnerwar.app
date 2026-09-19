import { Hero, Nav, ProductCard } from "@/components/landing/hero";
import {
  BooksStrip,
  DailyLoop,
  Faq,
  Footer,
  Gap,
  LedgerBand,
  PathsIndex,
  Pricing,
} from "@/components/landing/sections";

export default function Landing() {
  return (
    <main className="dark min-h-svh bg-night font-sans text-bone">
      <Nav />
      <Hero />
      <ProductCard />
      <BooksStrip />
      <LedgerBand />
      <Gap />
      <DailyLoop />
      <PathsIndex />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
