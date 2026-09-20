import { BookOpen01Icon, Target01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Eyebrow } from "@theinnerwar.app/ui/components/eyebrow";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icon";
import { Nav } from "@/components/landing/hero";
import { letterNote, pathDetails } from "@/components/landing/content";
import { Footer } from "@/components/landing/sections";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return pathDetails.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = pathDetails.find((p) => p.slug === slug);
  return path ? { title: `${path.title} · The Inner War`, description: path.d } : {};
}

// W2 · Path detail (§1.5).
export default async function PathDetail({ params }: Props) {
  const { slug } = await params;
  const path = pathDetails.find((p) => p.slug === slug);
  if (!path) notFound();

  return (
    <main className="dark min-h-svh bg-night font-sans text-bone">
      <Nav />

      <section className="mt-[22px] flex flex-col border-b border-hairline lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] px-4 pt-12 pb-12 sm:px-11 lg:pt-[60px] lg:pb-[50px]">
          <Eyebrow className="tracking-[0.2em]">{path.eyebrow}</Eyebrow>
          <h1 className="display text-[48px] leading-none tracking-[-0.04em] text-paper sm:text-[68px]">
            {path.title}
          </h1>
          <p className="max-w-[540px] text-[17px] leading-[1.6] text-sand text-pretty sm:text-lg">
            {path.d}
          </p>
          <ul className="mt-1.5 flex flex-wrap">
            {path.facts.map((f) => (
              <li
                key={f}
                className="mr-[18px] flex items-center gap-2 border-r border-white/14 py-[9px] pr-[18px] font-mono text-[10px] tracking-[0.14em] text-stone-muted"
              >
                <Icon icon={Tick02Icon} size={12} className="text-ember-glow/70" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-4">
            <NewsletterForm
              source={`path-${path.slug}`}
              size="lg"
              buttonLabel="Join the letters"
              note={letterNote}
            />
            <a href="#sample" className="self-start text-sm text-stone-muted hover:text-bone">
              Read the day 1 lesson
            </a>
          </div>
        </div>
        <div className="relative flex flex-none items-center justify-center border-t border-hairline bg-charcoal px-4 pt-12 pb-20 lg:w-[420px] lg:border-t-0 lg:border-l lg:py-12">
          <Image
            src={path.cover}
            alt={path.book}
            width={218}
            height={326}
            priority
            className="h-[326px] w-[218px] rounded border border-white/16 object-cover shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
          />
          <span className="absolute bottom-6 left-7 text-xs text-stone">{path.coverNote}</span>
        </div>
      </section>

      <section className="flex flex-col border-b border-hairline md:flex-row">
        {path.chapters.map((c, idx) => (
          <div
            key={c.tag}
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-2.5 border-hairline px-4 pt-[34px] pb-9 sm:px-8 md:border-l",
              idx > 0 && "border-t md:border-t-0",
              idx === 0 && "bg-ember/10",
            )}
          >
            <span
              className={cn(
                "flex items-center gap-2 font-mono text-[9px] tracking-[0.16em]",
                idx === 0 ? "text-ember-glow" : "text-stone-muted",
              )}
            >
              <Icon icon={BookOpen01Icon} size={12} />
              {c.tag}
            </span>
            <h2 className="font-serif text-[30px] leading-[1.06] tracking-[-0.02em] text-cream">
              {c.title}
            </h2>
            <p className="text-sm leading-[1.55] text-stone-muted text-pretty">{c.d}</p>
          </div>
        ))}
      </section>

      <section
        id="sample"
        className="flex flex-col gap-8 px-4 pt-10 pb-12 sm:px-11 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow className="flex items-center gap-2 tracking-[0.18em]">
            <Icon icon={Target01Icon} size={12} />
            SAMPLE LESSON · DAY 1
          </Eyebrow>
          <p className="font-serif text-[28px] leading-[1.1] tracking-[-0.025em] text-paper text-pretty sm:text-[34px]">
            {path.sample}
          </p>
          <p className="max-w-[620px] text-[15px] leading-[1.6] text-sand text-pretty">
            The app is not open yet. Join the letters and day 1 of this path is the first thing you
            will be able to open when it does.
          </p>
        </div>
        <NewsletterForm
          source={`path-${path.slug}-sample`}
          buttonLabel="Join"
          className="lg:w-[440px] lg:flex-none"
        />
      </section>

      <Footer />
    </main>
  );
}
