import { Wordmark } from "@theinnerwar.app/ui/components/ember-mark";
import { Eyebrow } from "@theinnerwar.app/ui/components/eyebrow";
import { Ledger } from "@theinnerwar.app/ui/components/ledger";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight01Icon,
  HelpCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";

import {
  askRows,
  books,
  faq,
  footerCols,
  gapPoints,
  loop,
  nav,
  pathDetails,
  paths,
  plans,
  sampleLedger,
  social,
} from "./content";

function SectionHead({
  eyebrow,
  title,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10",
        className,
      )}
    >
      <div className="flex max-w-[660px] flex-col gap-4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="display text-[40px] leading-[1.05] text-paper sm:text-[56px]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function BooksStrip() {
  return (
    <section
      id="books"
      className="flex flex-wrap items-center justify-center gap-x-11 gap-y-3 border-b border-hairline bg-night px-4 py-[30px] sm:px-11"
    >
      <span className="w-full text-center font-mono text-[9px] tracking-[0.2em] text-slate sm:w-auto">
        BUILT ON
      </span>
      {books.map((b) => (
        <span key={b} className="font-serif text-lg text-[#6f685e] sm:text-xl">
          {b}
        </span>
      ))}
    </section>
  );
}

export function LedgerBand() {
  return (
    <section className="flex items-center gap-5 border-b border-hairline bg-charcoal px-4 py-[34px] sm:gap-[34px] sm:px-11">
      <span className="hidden flex-none font-mono text-[9px] leading-[1.7] tracking-[0.18em] text-stone sm:block">
        THE
        <br />
        LEDGER
      </span>
      <Ledger
        days={sampleLedger}
        className="min-w-0 flex-1 gap-1.5 lg:grid-cols-[repeat(30,1fr)] lg:gap-[7px]"
        dotClassName="lg:text-[10px]"
      />
      <span className="flex-none font-mono text-[9px] leading-[1.7] tracking-[0.18em] text-ember-glow">
        11 / 12
        <br />
        HELD
      </span>
    </section>
  );
}

export function Gap() {
  return (
    <section
      id="philosophy"
      className="relative overflow-hidden border-b border-hairline bg-night px-4 pt-20 pb-20 sm:px-11 lg:pt-[104px] lg:pb-24"
    >
      <Image
        src="/images/statue-thinker.jpg"
        alt=""
        width={420}
        height={900}
        className="absolute top-0 right-0 h-full w-[260px] object-cover object-[42%_22%] opacity-50 [mask-image:linear-gradient(255deg,rgba(0,0,0,0.95),transparent_76%)] sm:w-[420px]"
      />
      <div className="relative flex max-w-[900px] flex-col gap-[22px]">
        <Eyebrow>THE GAP</Eyebrow>
        <h2 className="display text-[44px] leading-[1.04] text-paper sm:text-[64px]">
          You do not need more information.
        </h2>
      </div>
      <div className="relative mt-11 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-[60px]">
        <div className="flex flex-none flex-col gap-4 rounded-[20px] border border-white/10 bg-white/5 p-[22px] shadow-[0_26px_60px_rgba(0,0,0,0.4)] lg:w-[300px]">
          <Eyebrow size="xs" tone="muted" className="tracking-[0.18em]">
            WHAT A CAMPAIGN ASKS
          </Eyebrow>
          {askRows.map((a) => (
            <div
              key={a.k}
              className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-3"
            >
              <span className="flex items-center gap-2 text-sm text-parchment">
                <Icon icon={a.icon} size={14} className="text-ember-glow/70" />
                {a.k}
              </span>
              <span className="font-serif text-[22px] text-cream">{a.v}</span>
            </div>
          ))}
          <span className="text-[13px] leading-normal text-ash text-pretty">
            No feed, no streak anxiety, no content to keep up with.
          </span>
        </div>
        <ol className="flex max-w-[660px] min-w-0 flex-1 flex-col">
          {gapPoints.map((g) => (
            <li key={g.i} className="flex items-start gap-[22px] border-t border-white/10 py-5">
              <span className="flex-none pt-1 font-mono text-[10px] tracking-[0.14em] text-ember-glow">
                {g.i}
              </span>
              <span className="text-base leading-[1.6] text-parchment text-pretty">{g.t}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const loopOffsets = ["lg:mt-0", "lg:mt-[38px]", "lg:mt-[76px]", "lg:mt-[114px]"];

export function DailyLoop() {
  return (
    <section
      id="how-it-works"
      className="flex flex-col gap-[52px] border-b border-hairline bg-charcoal px-4 pt-20 pb-24 sm:px-11 lg:pt-24 lg:pb-[110px]"
    >
      <SectionHead
        eyebrow="ONE DAY, FOUR MOVES"
        title="The same loop, thirty times."
        aside={
          <p className="max-w-[320px] text-[15px] leading-[1.6] text-stone-muted text-pretty">
            Fifteen minutes on an ordinary day. Less when the day is against you, and the smaller
            version still counts.
          </p>
        }
      />
      <ol className="relative grid gap-10 sm:grid-cols-2 lg:flex lg:items-start lg:gap-0">
        <div className="absolute top-24 right-0 left-0 hidden h-px bg-[linear-gradient(90deg,rgba(242,160,61,0.5),rgba(255,255,255,0.08))] lg:block" />
        {loop.map((l, idx) => (
          <li
            key={l.n}
            className={cn("flex min-w-0 flex-1 flex-col gap-3.5 lg:pr-[26px]", loopOffsets[idx])}
          >
            <span className="font-mono text-[10px] tracking-[0.18em] text-stone">{l.meta}</span>
            <span
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border border-ember-light/50",
                idx === 0 ? "bg-ember text-[#1a1613]" : "bg-[#3a332c] text-ember-glow",
              )}
            >
              <Icon icon={l.icon} size={16} />
            </span>
            <span
              className={cn(
                "font-serif text-[52px] leading-[0.9] font-light",
                idx === 0 ? "text-ember-glow" : "text-[#6f685e]",
              )}
            >
              {l.n}
            </span>
            <span className="font-serif text-[25px] leading-[1.14] tracking-[-0.015em] text-cream">
              {l.t}
            </span>
            <span className="text-sm leading-[1.58] text-stone-muted text-pretty">{l.d}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PathsIndex() {
  return (
    <section id="paths" className="flex flex-col gap-10 bg-night px-4 pt-20 pb-10 sm:px-11 lg:pt-24">
      <SectionHead
        eyebrow="NINE PATHS, FOUR BOOKS"
        title="Start where your pattern is."
        aside={
          <span className="flex-none self-start rounded-full border border-white/18 px-6 py-3.5 text-[15px] text-bone lg:self-auto">
            Browse the library
          </span>
        }
      />
      <ul className="flex flex-col border-b border-white/10">
        {paths.map((p) => (
          <li
            key={p.i}
            className={cn(
              "relative flex flex-wrap items-center gap-x-[30px] gap-y-3 border-t border-white/10 py-[26px] pr-2 lg:flex-nowrap lg:pr-[26px]",
              p.featured && "bg-ember/7",
            )}
          >
            <span
              className={cn(
                "hidden w-[74px] flex-none font-mono text-[11px] tracking-[0.14em] sm:block",
                p.featured ? "text-ember-glow" : "text-stone",
              )}
            >
              {p.i}
            </span>
            <span className="relative h-[68px] w-[46px] flex-none overflow-hidden rounded-[3px] border border-white/14">
              <Image
                src={p.cover}
                alt=""
                fill
                sizes="46px"
                className="object-cover"
                style={{ opacity: p.coverOpacity }}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 lg:w-[330px] lg:flex-none">
              <span className="font-serif text-[13px] text-ash italic">{p.book}</span>
              <span className="font-serif text-[28px] leading-[1.06] tracking-[-0.025em] text-cream sm:text-[34px]">
                {p.title}
              </span>
            </span>
            <span className="w-full min-w-0 text-[15px] leading-[1.55] text-stone-muted text-pretty lg:w-auto lg:flex-1">
              {p.d}
            </span>
            <span
              className={cn(
                "flex-none font-mono text-[9px] tracking-[0.16em]",
                p.featured ? "text-ember-glow" : "text-stone",
              )}
            >
              {p.meta}
            </span>
            <Icon icon={ArrowRight01Icon} size={16} className="hidden text-stone-muted lg:block" />
            {pathDetails.some((d) => d.slug === p.slug) ? (
              <Link
                href={`/paths/${p.slug}`}
                aria-label={p.title}
                className="absolute inset-0"
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="flex flex-col gap-[46px] bg-night pt-20 pb-24 lg:pt-24 lg:pb-[100px]">
      <SectionHead
        className="px-4 sm:px-11"
        eyebrow="THREE FREE DAYS ON BOTH"
        title="Pay once, or pay monthly."
        aside={
          <p className="max-w-[330px] text-[15px] leading-[1.6] text-stone-muted text-pretty">
            Experience day one before deciding. Nothing is charged until the free introduction ends.
          </p>
        }
      />
      <div className="flex flex-col border-y border-white/12 md:flex-row">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col gap-[18px] overflow-hidden px-4 pt-10 pb-[38px] sm:px-11",
              p.featured && "border-t border-ember-light/28 bg-ember/9 md:border-t-0 md:border-l",
            )}
          >
            {p.featured ? (
              <Image
                src="/images/defeat-sword.jpg"
                alt=""
                width={330}
                height={330}
                className="pointer-events-none absolute -right-10 -bottom-[30px] size-[330px] object-contain opacity-16 grayscale invert"
              />
            ) : null}
            <span className="relative flex items-baseline gap-3">
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.2em]",
                  p.featured ? "text-ember-glow" : "text-stone-muted",
                )}
              >
                {p.label}
              </span>
              {p.badge ? (
                <span className="rounded-full bg-ember px-2.5 py-1 font-mono text-[8px] tracking-[0.14em] text-[#1a1613]">
                  {p.badge}
                </span>
              ) : null}
            </span>
            <span className="relative flex items-baseline gap-2.5">
              <span className="font-serif text-[60px] leading-[0.9] tracking-[-0.04em] text-paper sm:text-[70px]">
                {p.price}
              </span>
              <span className="text-base text-stone-muted">{p.per}</span>
            </span>
            <p className="relative max-w-[440px] text-[15px] leading-[1.6] text-sand text-pretty">{p.d}</p>
            <ul className="relative mt-1.5 flex flex-col">
              {p.rows.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2.5 border-t border-hairline py-3 text-sm leading-normal text-parchment text-pretty"
                >
                  <Icon icon={Tick02Icon} size={14} className="mt-0.5 text-ember-glow" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="relative mt-auto flex flex-col gap-3 pt-6">
              <span className="text-xs text-stone">
                {p.note} · the app is not open yet. Join the letters and we'll tell you the day it
                opens.
              </span>
              <NewsletterForm source={`pricing-${p.id}`} buttonLabel="Notify me" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section
      id="faq"
      className="flex flex-col gap-10 bg-charcoal px-4 pt-20 pb-24 sm:px-11 lg:flex-row lg:items-start lg:gap-[70px] lg:pt-[92px] lg:pb-[100px]"
    >
      <div className="flex flex-none flex-col gap-4 lg:w-[340px]">
        <Eyebrow>QUESTIONS</Eyebrow>
        <h2 className="display text-[40px] leading-[1.06] tracking-[-0.03em] text-paper sm:text-[46px]">
          Before you start.
        </h2>
        <p className="text-[15px] leading-[1.6] text-stone-muted text-pretty">
          Anything else, write to us. A person answers within two days.
        </p>
      </div>
      <dl className="flex min-w-0 flex-1 flex-col">
        {faq.map((q) => (
          <div
            key={q.q}
            className="flex flex-col gap-3 border-b border-hairline py-6 md:flex-row md:items-start md:gap-[26px]"
          >
            <dt className="flex min-w-0 flex-1 items-start gap-3 font-serif text-[22px] leading-[1.25] text-cream text-pretty">
              <Icon icon={HelpCircleIcon} size={18} className="mt-1.5 text-ember-glow/80" />
              {q.q}
            </dt>
            <dd className="min-w-0 flex-1 text-[15px] leading-[1.6] text-stone-muted text-pretty">
              {q.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const anchorFor = new Map<string, string>(nav.map((n) => [n.label, n.href]));

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0d0c0b]">
      <Image
        src="/images/statue-reading.jpg"
        alt=""
        width={1440}
        height={420}
        className="absolute top-0 left-0 h-[420px] w-full object-cover object-[50%_22%]"
      />
      <div className="absolute top-0 right-0 left-0 h-[420px] bg-[linear-gradient(rgba(13,12,11,0.35)_0%,rgba(13,12,11,0.72)_46%,#0d0c0b_96%)]" />

      <div className="relative flex flex-col gap-10 px-4 pt-24 pb-11 sm:px-11 lg:flex-row lg:items-start lg:justify-between lg:gap-[60px] lg:pt-[104px]">
        <div className="flex max-w-[640px] flex-col gap-4">
          <Eyebrow>BEGIN</Eyebrow>
          <h2 className="display text-[44px] leading-[1.02] text-paper sm:text-[62px]">
            Take one day and see.
          </h2>
          <p className="max-w-[520px] text-base leading-[1.6] text-sand text-pretty">
            Start with a letter. One story or principle every Sunday, and the first word when the
            app opens.
          </p>
        </div>
        <div className="flex w-full flex-none flex-col gap-2.5 lg:w-[440px]">
          <NewsletterForm source="footer" buttonLabel="Join" />
        </div>
      </div>

      <div className="relative px-4 sm:px-11">
        <div className="h-px bg-white/12" />
      </div>

      <div className="relative flex flex-col gap-10 px-4 pt-10 pb-[30px] sm:px-11 md:flex-row md:items-start md:justify-between md:gap-[60px]">
        <div className="flex flex-col gap-3">
          <Wordmark className="[&>span:last-child]:text-xl [&>span:last-child]:text-bone [&>svg]:size-4" />
          <span className="text-[13px] text-stone">Copyright © 2026</span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-[#4f4a43]">
            SMALL HOURS. LASTING CHANGE.
          </span>
        </div>
        <div className="flex flex-wrap gap-x-14 gap-y-8">
          {footerCols.map((c) => (
            <div key={c.h} className="flex flex-col gap-2.5">
              <span className="font-mono text-[9px] tracking-[0.18em] text-stone">{c.h}</span>
              {c.links.map((l) => {
                const href = anchorFor.get(l);
                const cls = "border-l border-white/18 pl-3 text-sm text-stone-muted no-underline";
                return href ? (
                  <a
                    key={l}
                    href={href}
                    data-cta={`footer:${l.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(cls, "hover:text-bone")}
                  >
                    {l}
                  </a>
                ) : (
                  <span key={l} className={cls}>
                    {l}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-5 px-4 pb-[34px] sm:flex-row sm:items-center sm:justify-between sm:gap-[30px] sm:px-11">
        <span className="text-xs text-[#4f4a43]">
          Principles are quoted and credited to their authors. The missions are ours.
        </span>
        <div className="flex gap-2.5">
          {social.map((s) => (
            <span
              key={s.label}
              title={s.label}
              className="flex size-[34px] items-center justify-center rounded-full border border-white/16 text-stone-muted"
            >
              <Icon icon={s.icon} size={15} />
              <span className="sr-only">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
