import { Calendar03Icon, Coins01Icon, QuoteDownIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Wordmark } from "@theinnerwar.app/ui/components/ember-mark";
import { Eyebrow } from "@theinnerwar.app/ui/components/eyebrow";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";

const description =
  "One story or principle every Sunday, and what it looks like when an ordinary person actually uses it.";

export const metadata: Metadata = {
  title: "The Sunday letter · The Inner War",
  description,
  openGraph: {
    title: "The Sunday letter from The Inner War",
    description,
    images: [{ url: "/images/statue-hand.jpg", width: 450, height: 900, alt: "The Inner War" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "The Sunday letter from The Inner War", description },
};

const facts = [
  { v: "Sunday", k: "ONE LETTER A WEEK", icon: Calendar03Icon },
  { v: "Free", k: "TO JOIN", icon: Coins01Icon },
  { v: "1 click", k: "TO LEAVE", icon: Tick02Icon },
] as const;

// /newsletter: the link in every social bio. One job: join the letters.
export default function NewsletterPage() {
  return (
    <main className="dark relative flex min-h-svh flex-col overflow-hidden bg-night font-sans text-bone">
      {/* The statue sits behind the copy on phones and beside it on wide screens. */}
      <div className="absolute inset-0 lg:left-auto lg:w-[46%]">
        <Image
          src="/images/statue-hand.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="object-cover object-[50%_40%] opacity-55 lg:opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,13,12,0.55)_0%,rgba(15,13,12,0.35)_30%,rgba(15,13,12,0.92)_62%,#0f0d0c_100%)] lg:bg-[linear-gradient(95deg,#0f0d0c_0%,rgba(15,13,12,0.5)_30%,rgba(15,13,12,0.05)_70%,rgba(15,13,12,0.5)_100%)]" />
      </div>
      <div className="pointer-events-none absolute -top-[300px] -left-[260px] h-[640px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(226,112,31,0.28),transparent_72%)] blur-[12px]" />

      <header className="relative flex items-center justify-between px-5 pt-6 sm:px-11 sm:pt-8">
        <Link href="/" aria-label="The Inner War, home" className="rounded-full border border-white/12 bg-[rgba(29,23,18,0.8)] px-4 py-2.5 backdrop-blur">
          <Wordmark />
        </Link>
        <Link href="/" className="text-sm text-stone-muted underline-offset-4 hover:text-bone hover:underline">
          What is this?
        </Link>
      </header>

      <section className="relative flex flex-1 flex-col justify-end px-5 pt-40 pb-10 sm:px-11 lg:max-w-[58%] lg:justify-center lg:pt-16 lg:pb-16">
        <div className="flex max-w-[620px] flex-col gap-6">
          <Eyebrow>THE INNER WAR · THE SUNDAY LETTER</Eyebrow>
          <h1 className="display text-[48px] leading-[0.98] tracking-[-0.04em] text-paper sm:text-[68px] xl:text-[84px]">
            Win the battles
            <br />
            within you.
          </h1>
          <p className="text-[17px] leading-[1.6] text-sand text-pretty sm:text-lg">
            One story or principle every Sunday, drawn from books like <em className="font-serif">The War of Art</em>,{" "}
            <em className="font-serif">Meditations</em> and <em className="font-serif">Atomic Habits</em>, and what it
            looks like when an ordinary person actually uses it. Nothing to keep up with. You only have to open it.
          </p>

          <NewsletterForm
            source="newsletter-page"
            size="lg"
            buttonLabel="Send me the letter"
            note="You'll also hear here first when the app opens."
          />

          <dl className="mt-2 flex gap-7 sm:gap-11">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-col-reverse gap-[3px]">
                <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-stone">
                  <Icon icon={f.icon} size={12} className="text-ember-glow/70" />
                  {f.k}
                </dt>
                <dd className="font-serif text-[26px] leading-none text-cream sm:text-[30px]">{f.v}</dd>
              </div>
            ))}
          </dl>

          <figure className="relative mt-4 border-l-2 border-ember pl-5">
            <Icon icon={QuoteDownIcon} size={16} className="absolute -top-1 left-5 text-ember/70" />
            <blockquote className="font-serif text-xl leading-[1.45] text-cream italic text-pretty sm:text-[22px]">
              You do not have to finish the task now. You only have to make the beginning undeniable.
            </blockquote>
          </figure>
        </div>
      </section>

      <footer className="relative flex flex-wrap items-center justify-between gap-3 px-5 pb-7 font-mono text-[10px] tracking-[0.14em] text-[#4f4a43] sm:px-11">
        <span>SMALL HOURS. LASTING CHANGE.</span>
        <span>UNSUBSCRIBE ANY TIME</span>
      </footer>
    </main>
  );
}
