"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import {
  Analytics01Icon,
  Cancel01Icon,
  DashboardSquare01Icon,
  Logout03Icon,
  Mail01Icon,
  Menu01Icon,
  Settings02Icon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { dateTime } from "@/lib/format";
import { clearSession, readSession } from "@/lib/session";
import { trpc } from "@/lib/trpc";

import { Icon } from "./icon";
import { Flame, Mono } from "./kit";

// The persistent rail from every Dispatch screen (N1–N9).

const NAV = [
  { href: "/", label: "Overview", icon: DashboardSquare01Icon },
  { href: "/issues", label: "Issues", icon: Mail01Icon, badge: "issues" as const },
  { href: "/subscribers", label: "Subscribers", icon: UserGroupIcon },
  { href: "/conversions", label: "Conversions", icon: Analytics01Icon },
  { href: "/deliverability", label: "Deliverability", icon: ShieldCheckIcon },
  { href: "/settings", label: "Settings", icon: Settings02Icon },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      console.info("[dispatch] no session, redirecting to /login");
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => setOpen(false), [pathname]);

  const shell = useQuery({ ...trpc.dispatch.shell.queryOptions(), enabled: ready, refetchInterval: 30_000 });

  if (!ready) return <div className="min-h-svh bg-charcoal" />;

  const rail = (
    <nav className="flex h-full flex-col bg-night py-[22px]">
      <div className="flex items-center gap-2.5 px-[18px] pb-2">
        <Flame />
        <span className="font-serif text-[19px] text-cream">Dispatch</span>
      </div>
      <Mono className="px-[18px] pb-5 text-[9px] text-slate">THE INNER WAR · INTERNAL</Mono>
      <div className="flex flex-col gap-0.5 px-3">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          const badge = "badge" in n && shell.data?.openIssues ? shell.data.openIssues : null;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex h-[38px] items-center gap-[11px] rounded-[9px] px-3 transition-colors",
                active ? "bg-ember/13 text-ember-glow" : "text-stone-muted hover:bg-white/[0.04] hover:text-bone",
              )}
            >
              <Icon icon={n.icon} size={17} />
              <span className="flex-1 text-sm">{n.label}</span>
              {badge ? <span className="font-mono text-[10px] text-slate">{badge}</span> : null}
            </Link>
          );
        })}
      </div>

      {shell.data?.nextOut ? (
        <div className="mx-3 mt-[22px] flex flex-col gap-[9px] px-1.5">
          <Mono className="px-1.5 text-[9px] text-slate">{shell.data.nextOut.status === "SENDING" ? "GOING OUT NOW" : "NEXT OUT"}</Mono>
          <Link
            href={`/issues/${shell.data.nextOut.id}/send`}
            className="flex flex-col gap-[5px] rounded-xl border border-ember-light/24 bg-ember/10 p-3 hover:border-ember-light/40"
          >
            <span className="font-serif text-base leading-[1.2] text-bone text-pretty">{shell.data.nextOut.subject}</span>
            <span className="font-mono text-[10px] text-ember-glow uppercase">
              {shell.data.nextOut.status === "SENDING" ? "SENDING" : dateTime(shell.data.nextOut.scheduledFor)}
            </span>
          </Link>
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-[11px] px-[18px]">
        <span className="size-8 flex-none rounded-full border border-white/14 bg-[linear-gradient(150deg,#5a5048,#302a25)]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-bone" title={shell.data?.email}>Editor</span>
          <span className={cn("font-mono text-[9px]", shell.data?.canSend ? "text-slate" : "text-[#e0a294]")}>
            {shell.data ? (shell.data.canSend ? "CAN SEND" : "SMTP NOT SET") : "…"}
          </span>
        </span>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
          className="flex size-8 items-center justify-center rounded-lg text-stone hover:bg-white/5 hover:text-bone"
        >
          <Icon icon={Logout03Icon} size={16} />
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-svh bg-charcoal text-bone">
      <aside className="sticky top-0 hidden h-svh w-[236px] flex-none border-r border-white/8 lg:block">{rail}</aside>

      {/* Below lg the rail becomes a drawer. */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 flex size-12 items-center justify-center rounded-full bg-ember-gradient text-button-ink shadow-lg lg:hidden"
      >
        <Icon icon={Menu01Icon} size={20} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[260px] border-r border-white/8">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute top-4 right-3 z-10 text-stone-muted">
              <Icon icon={Cancel01Icon} size={20} />
            </button>
            {rail}
          </aside>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
