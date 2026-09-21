import { Wordmark } from "@theinnerwar.app/ui/components/ember-mark";
import { Eyebrow } from "@theinnerwar.app/ui/components/eyebrow";
import { Ledger } from "@theinnerwar.app/ui/components/ledger";
import { Chevron, pillButtonVariants } from "@theinnerwar.app/ui/components/pill-button";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";

import { QuoteDownIcon, Target01Icon } from "@hugeicons/core-free-icons";

import { heroStats, letterNote, nav, sampleLedger } from "./content";

export function Nav() {
  return (
    <div className="flex justify-center bg-night px-4 pt-[22px] sm:px-11">
      <nav className="flex w-full max-w-max items-center justify-between gap-3 rounded-full border border-white/12 bg-[rgba(29,23,18,0.9)] py-2 pr-2 pl-4 sm:gap-[26px] sm:pl-[22px] shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
        <Link href="/" aria-label="The Inner War, home" className="no-underline">
          <Wordmark />
        </Link>
        <span className="hidden h-5 w-px bg-white/12 lg:block" />
        <span className="hidden items-center gap-6 lg:flex">
          {nav.map((n, idx) => (
            <a
              key={n.i}
              href={n.href}
              data-cta={`nav:${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex items-baseline gap-1.5 no-underline hover:text-ember-glow"
            >
              <Icon icon={n.icon} size={14} className={idx === 0 ? "text-ember-glow" : "text-stone"} />
              <span className={cn("text-sm", idx === 0 ? "text-bone" : "text-stone-muted")}>
                {n.label}
              </span>
            </a>
          ))}
        </span>
        <a
          href="/#join"
          data-cta="nav:get-the-letters"
          className={cn(pillButtonVariants({ size: "sm" }), "shadow-none")}
        >
          Get the letters
        </a>
      </nav>
    </div>
  );
}

export function Hero() {
  return (
    <section className="flex flex-col border-b border-hairline lg:flex-row lg:items-stretch">
      <div className="relative flex min-w-0 flex-1 flex-col gap-[26px] overflow-hidden px-4 pt-16 pb-12 sm:px-11 lg:pt-[74px] lg:pb-[54px]">
        <div className="pointer-events-none absolute -top-[280px] -left-[220px] h-[640px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(226,112,31,0.3),transparent_72%)] blur-[12px]" />
        <Eyebrow className="relative">A 30-DAY CAMPAIGN — NOT A LIBRARY</Eyebrow>
        <h1 className="display relative text-[56px] leading-[0.97] tracking-[-0.04em] text-paper sm:text-[76px] xl:text-[92px]">
          Win the battles
          <br />
          within you.
        </h1>
        <div className="relative flex max-w-[640px] items-start gap-7">
          <span className="mt-3.5 hidden h-px w-[46px] flex-none bg-ember-light/70 sm:block" />
          <p className="text-[17px] leading-[1.62] text-sand sm:text-lg">
            Principles from books you already respect, turned into one lesson, one mission and one
            line of evidence a day. Thirty days against the pattern that has been holding you back.
          </p>
        </div>
        <div className="relative mt-2 flex flex-col gap-5">
          <NewsletterForm
            id="join"
            source="hero"
            size="lg"
            buttonLabel="Join the letters"
            note={letterNote}
            className="scroll-mt-28"
          />
          <a
            href="#how-it-works"
            data-cta="hero:see-how-a-day-works"
            className="flex items-center gap-2.5 self-start text-[15px] text-bone no-underline hover:text-ember-glow"
          >
            See how a day works
            <Chevron />
          </a>
        </div>
        <dl className="relative mt-auto flex gap-8 pt-[34px] sm:gap-11">
          {heroStats.map((s) => (
            <div key={s.k} className="flex flex-col-reverse gap-[3px]">
              <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-stone">
                <Icon icon={s.icon} size={12} className="text-ember-glow/70" />
                {s.k}
              </dt>
              <dd className="font-serif text-[30px] leading-none text-cream">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative h-[420px] flex-none border-t sm:h-[520px] border-hairline lg:h-auto lg:w-[460px] lg:border-t-0 lg:border-l xl:w-[560px]">
        <Image
          src="/images/statue-hand.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 560px, (min-width: 1024px) 460px, 100vw"
          className="object-cover object-[48%_46%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(95deg,#0f0d0c_0%,rgba(15,13,12,0.45)_26%,rgba(15,13,12,0.05)_62%,rgba(15,13,12,0.55)_100%)]" />
        <span className="absolute top-[26px] right-[26px] font-mono text-[9px] tracking-[0.2em] text-cream/60 [writing-mode:vertical-rl]">
          DAY 12 OF 30 · II. THE WORK
        </span>
        <div className="absolute right-[26px] bottom-[26px] left-[26px] flex items-center gap-3.5 rounded-2xl border border-white/12 bg-night/72 px-[18px] py-4">
          <Image
            src="/images/war-of-art-cover.jpg"
            alt="The War of Art"
            width={56}
            height={84}
            className="h-[84px] w-14 flex-none rounded-[3px] border border-white/16 object-cover"
          />
          <span className="flex min-w-0 flex-col gap-1">
            <Eyebrow size="xs">TODAY’S PRINCIPLE</Eyebrow>
            <span className="font-serif text-[21px] leading-[1.15] text-cream text-pretty">
              Show up when the feeling is absent.
            </span>
            <span className="text-[11px] text-stone-muted">The War of Art · Steven Pressfield</span>
          </span>
        </div>
      </div>
    </section>
  );
}

export function ProductCard() {
  return (
    <section className="relative overflow-hidden border-b border-hairline bg-ink px-4 pt-16 pb-16 sm:px-11 lg:pt-[74px] lg:pb-[84px]">
      <div className="pointer-events-none absolute -top-[220px] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.1),transparent_70%)] blur-[20px]" />
      <div className="relative mx-auto mb-[30px] flex max-w-[620px] flex-col items-center gap-3 text-center">
        <Eyebrow>THE APP, ON DAY TWELVE</Eyebrow>
        <h2 className="display text-[32px] leading-[1.08] tracking-[-0.03em] text-paper sm:text-[40px]">
          One screen. Today, and the proof behind it.
        </h2>
      </div>

      <div className="relative mx-auto flex max-w-[1080px] flex-col gap-[18px] rounded-[26px] border border-white/12 bg-[rgba(23,19,16,0.92)] p-[18px] shadow-[0_44px_100px_rgba(0,0,0,0.66)] lg:flex-row">
        <div className="flex flex-none flex-col gap-[15px] rounded-[20px] border border-white/10 bg-[radial-gradient(120%_62%_at_50%_0%,#2b211a,#17130f)] p-5 lg:w-[262px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-stone-muted">Good evening, Marcus</span>
            <span className="font-serif text-[22px] text-bone italic">Defeat Resistance</span>
            <span className="font-mono text-[9px] tracking-[0.15em] text-[#9a9084]">DAY 12 OF 30</span>
          </div>
          <div className="size-[126px] self-center rounded-full bg-[conic-gradient(#e2701f_0turn_0.4turn,rgba(255,255,255,0.08)_0.4turn_1turn)] p-[5px] shadow-[0_0_38px_rgba(226,112,31,0.24)]">
            <div className="flex size-full flex-col items-center justify-center rounded-full bg-[radial-gradient(70%_70%_at_50%_34%,#2e241c,#17130f)]">
              <span className="font-serif text-[38px] leading-[0.9] text-cream">12</span>
              <span className="font-mono text-[8px] tracking-[0.18em] text-[#b3a795]">OF 30 DAYS</span>
            </div>
          </div>
          <div className="flex flex-col gap-[5px] rounded-[14px] border border-white/10 bg-white/5 p-[13px]">
            <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.16em] text-ember-glow">
              <Icon icon={Target01Icon} size={11} />
              TODAY’S MISSION · 25 MIN
            </span>
            <span className="text-[13px] leading-[1.35] text-bone">
              Work the manuscript at the hour you named.
            </span>
          </div>
          <div className="flex h-[42px] items-center justify-center rounded-full bg-ember-gradient">
            <span className="text-[13px] font-semibold text-button-ink">Continue today’s lesson</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-4 rounded-[18px] border border-ember-light/24 bg-[linear-gradient(150deg,rgba(226,112,31,0.16),rgba(255,255,255,0.03))] p-[18px]">
              <Image
                src="/images/war-of-art-cover.jpg"
                alt="The War of Art"
                width={74}
                height={110}
                className="h-[110px] w-[74px] flex-none rounded border border-white/14 object-cover shadow-[0_12px_26px_rgba(0,0,0,0.45)]"
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Eyebrow size="xs">TODAY’S PRINCIPLE</Eyebrow>
                <span className="font-serif text-[26px] leading-[1.12] tracking-[-0.015em] text-cream text-pretty">
                  Show up when the feeling is absent.
                </span>
                <span className="text-xs text-stone-muted">The War of Art · Steven Pressfield</span>
              </div>
            </div>
            <div className="flex flex-none flex-col justify-between gap-3 rounded-[18px] border border-white/10 bg-white/5 p-[18px] sm:w-[216px]">
              <Eyebrow size="xs" tone="muted" className="flex items-center gap-1.5">
                <Icon icon={QuoteDownIcon} size={11} />
                EVIDENCE
              </Eyebrow>
              <span className="font-serif text-base leading-[1.35] text-[#efe8dc] italic text-pretty">
                “Wrote the wrong sentence first, then four right ones.”
              </span>
              <span className="font-mono text-[9px] text-stone">DAY 11</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3.5 rounded-[18px] border border-hairline bg-white/[0.045] p-[18px]">
            <div className="flex items-baseline justify-between">
              <Eyebrow size="xs" tone="muted">
                THE THIRTY DAYS
              </Eyebrow>
              <span className="font-mono text-[9px] tracking-[0.14em] text-ember-glow">11 / 12 HELD</span>
            </div>
            <Ledger days={sampleLedger} className="gap-1.5 sm:gap-2" />
          </div>
        </div>
      </div>
    </section>
  );
}
