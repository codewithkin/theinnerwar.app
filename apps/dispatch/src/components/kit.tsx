"use client";

import { cn } from "@theinnerwar.app/ui/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Building blocks repeated across the Dispatch screens (designs/Newsletter N1–N9).

export const GREEN = "#8fb894";

/** The ember leaf used as Dispatch's mark and on the welcome row. */
export function Flame({ size = 17, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block flex-none -rotate-45 bg-[linear-gradient(160deg,#f8c06b,#e2701f)]", className)}
      style={{ width: size, height: size, borderRadius: "58% 8% 55% 55%" }}
    />
  );
}

export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono text-[10px] tracking-[0.16em] text-stone-muted uppercase", className)} {...props} />;
}

export function Panel({ className, tone = "plain", ...props }: ComponentProps<"div"> & { tone?: "plain" | "ember" | "green" | "dashed" }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border p-[22px]",
        tone === "plain" && "border-white/9 bg-white/[0.04]",
        tone === "ember" && "border-ember-light/26 bg-[linear-gradient(150deg,rgba(226,112,31,0.18),rgba(255,255,255,0.03))]",
        tone === "green" && "border-[rgba(143,184,148,0.26)] bg-[rgba(111,152,115,0.12)]",
        tone === "dashed" && "border-dashed border-white/16",
        className,
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  note,
  delta,
  tone = "plain",
  labelClassName,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  delta?: { text: string; up: boolean | null; good?: boolean } | null;
  tone?: "plain" | "ember" | "green";
  labelClassName?: string;
}) {
  const good = delta ? (delta.good ?? delta.up) : null;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-[5px] rounded-[18px] border px-5 py-[18px]",
        tone === "plain" && "border-white/9 bg-white/[0.045]",
        tone === "ember" && "border-ember-light/28 bg-ember/13",
        tone === "green" && "border-[rgba(143,184,148,0.26)] bg-[rgba(111,152,115,0.12)]",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <Mono className={cn("text-[9px]", tone === "ember" && "text-ember-glow", tone === "green" && "text-[#8fb894]", labelClassName)}>{label}</Mono>
        {delta ? (
          <span className={cn("font-mono text-[10px]", good === null ? "text-stone" : good ? "text-[#8fb894]" : "text-[#e0a294]")}>{delta.text}</span>
        ) : null}
      </span>
      <span className="font-serif text-[34px] leading-none text-paper">{value}</span>
      {note ? <span className="text-xs leading-[1.45] text-ash text-pretty">{note}</span> : null}
    </div>
  );
}

const buttonStyles = {
  ember: "bg-ember-gradient font-semibold text-button-ink hover:brightness-110",
  outline: "border border-white/14 text-parchment hover:border-white/25 hover:text-bone",
  soft: "border border-ember-light/32 bg-ember/16 text-ember-pale",
  danger: "border border-[rgba(190,90,68,0.4)] text-[#e0a294] hover:bg-[rgba(110,42,28,0.25)]",
} as const;

type ButtonProps = { variant?: keyof typeof buttonStyles; size?: "sm" | "md" | "lg"; pending?: boolean; className?: string };

function buttonClass({ variant = "outline", size = "md", className }: ButtonProps) {
  return cn(
    "inline-flex flex-none items-center justify-center gap-2 whitespace-nowrap transition-[filter,border-color,background-color,color] disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-8 rounded-lg px-3 text-xs",
    size === "md" && "h-[34px] rounded-[9px] px-[14px] text-[13px]",
    size === "lg" && "h-[54px] rounded-full px-8 text-base",
    buttonStyles[variant],
    className,
  );
}

export function Button({ variant, size, pending, className, children, disabled, ...props }: ButtonProps & ComponentProps<"button">) {
  return (
    <button type="button" className={buttonClass({ variant, size, className })} disabled={disabled || pending} {...props}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }: ButtonProps & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

const statusStyle: Record<string, string> = {
  SENT: "border-[rgba(143,184,148,0.3)] bg-[rgba(111,152,115,0.16)] text-[#8fb894]",
  SCHEDULED: "border-ember-light/40 bg-ember/18 text-ember-pale",
  SENDING: "border-ember-light/40 bg-ember/18 text-ember-pale",
  DRAFT: "border-white/13 bg-white/5 text-ash",
  CANCELED: "border-white/13 bg-white/5 text-stone",
  USER: "border-[rgba(143,184,148,0.34)] bg-[rgba(111,152,115,0.16)] text-[#8fb894]",
  READING: "border-ember-light/26 bg-ember/13 text-ember-glow",
  COLD: "border-white/12 bg-white/5 text-stone",
  UNSUBSCRIBED: "border-white/12 bg-white/5 text-stone",
  BOUNCED: "border-[rgba(190,90,68,0.4)] bg-[rgba(110,42,28,0.3)] text-[#e0a294]",
  COMPLAINED: "border-[rgba(190,90,68,0.4)] bg-[rgba(110,42,28,0.3)] text-[#e0a294]",
  PASSING: "text-[#8fb894]",
  MISSING: "text-[#e0a294]",
  WARNING: "text-ember-pale",
  UNKNOWN: "text-ash",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 font-mono text-[9px] tracking-[0.1em]", statusStyle[status] ?? statusStyle.DRAFT, className)}>
      {status}
    </span>
  );
}

export function Bar({ value, color = "rgba(226,112,31,0.42)", height = 6, className }: { value: number; color?: string; height?: number; className?: string }) {
  return (
    <span className={cn("block overflow-hidden rounded-full bg-white/7", className)} style={{ height }}>
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} />
    </span>
  );
}

export function PageHeader({ title, meta, actions, back }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; back?: string }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-[62px] flex-none flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-charcoal/95 px-5 py-3 backdrop-blur lg:px-7">
      <span className="flex min-w-0 items-center gap-4">
        {back ? (
          <Link href={back} aria-label="Back" className="flex size-8 flex-none items-center justify-center rounded-[9px] border border-white/14 hover:border-white/25">
            <span className="-ml-0.5 size-[7px] rotate-45 border-b-[1.6px] border-l-[1.6px] border-parchment" />
          </Link>
        ) : null}
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="truncate font-serif text-[21px] text-cream">{title}</h1>
          {meta ? <Mono className="tracking-[0.14em] text-ash">{meta}</Mono> : null}
        </span>
      </span>
      {actions ? <span className="flex flex-wrap items-center gap-2.5">{actions}</span> : null}
    </header>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 p-16 text-sm text-ash">
      <Loader2 className="size-4 animate-spin text-ember-glow" />
      {label}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[18px] border border-dashed border-white/14 p-6">
      <span className="font-serif text-xl text-cream">{title}</span>
      {body ? <p className="max-w-[520px] text-sm leading-[1.55] text-ash text-pretty">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <span className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 items-center gap-2 rounded-lg border px-[13px] text-xs transition-colors",
            o.value === value ? "border-ember-light/32 bg-ember/16 text-ember-pale" : "border-white/14 text-stone-muted hover:text-bone",
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className={cn("font-mono text-[10px]", o.value === value ? "text-ember-glow" : "text-slate")}>{o.count.toLocaleString()}</span> : null}
        </button>
      ))}
    </span>
  );
}
