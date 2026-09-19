"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Bar, ButtonLink, GREEN, Loading, Mono, PageHeader, Panel, StatCard } from "@/components/kit";
import { WriteIssueButton } from "@/components/write-issue";
import { ago, day, delta, num, pct } from "@/lib/format";
import { trpc } from "@/lib/trpc";

// N1 · Overview: conversion rate first, everything else in support.
export default function OverviewPage() {
  const { data, isLoading } = useQuery(trpc.dispatch.overview.queryOptions());

  return (
    <>
      <PageHeader title="Overview" meta="LAST 30 DAYS" actions={<WriteIssueButton />} />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-[18px] px-5 py-[26px] lg:px-7">
          <div className="flex flex-col gap-[18px] xl:flex-row">
            <Panel tone="ember" className="flex flex-none flex-col gap-3.5 p-6 xl:w-[420px]">
              <Mono className="tracking-[0.18em] text-ember-glow">CONVERSION RATE</Mono>
              <span className="flex items-baseline gap-3">
                <span className="font-serif text-[72px] leading-[0.88] tracking-[-0.04em] text-paper">{pct(data.conversionRate)}</span>
                {(() => {
                  const d = delta(data.conversionRate, data.conversionRateMonthAgo, true);
                  return <span className={d.up === false ? "font-mono text-xs text-[#e0a294]" : "font-mono text-xs text-[#8fb894]"}>{d.text}</span>;
                })()}
              </span>
              <span className="text-sm leading-[1.55] text-sand text-pretty">
                {num(data.converted)} of {num(data.activeSubscribers)} subscribers have opened an account.{" "}
                {data.conversionRateMonthAgo !== data.conversionRate
                  ? `${data.conversionRate > data.conversionRateMonthAgo ? "Up" : "Down"} from ${pct(data.conversionRateMonthAgo)} a month ago.`
                  : "Unchanged from a month ago."}
              </span>
              <Bar value={data.conversionRate} height={8} color="linear-gradient(90deg,#f2a03d,#e2701f)" className="mt-auto" />
              <span className="flex items-baseline justify-between font-mono text-[10px]">
                <span className="text-ember-glow">{num(data.converted)} CONVERTED</span>
                <span className="text-stone">{num(Math.max(0, data.activeSubscribers - data.converted))} STILL READING</span>
              </span>
            </Panel>

            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3.5 sm:grid-cols-2">
              <StatCard
                label="SUBSCRIBERS"
                value={num(data.activeSubscribers)}
                note={`${num(data.last30Days.joined)} joined this month`}
                delta={delta(data.last30Days.joined, data.previous30Days.joined)}
              />
              <StatCard
                label="SIGNUPS FROM THE LIST"
                value={num(data.last30Days.converted)}
                note={`this month, ${num(data.converted)} all time`}
                delta={delta(data.last30Days.converted, data.previous30Days.converted)}
              />
              <StatCard
                label="OPEN RATE"
                value={data.lastIssue ? pct(data.lastIssue.openRate) : "—"}
                note={`last issue, ${num(data.sentCount)} sent total`}
                delta={data.lastIssue && data.previousIssue ? delta(data.lastIssue.openRate, data.previousIssue.openRate, true) : null}
              />
              <StatCard
                label="UNSUBSCRIBES"
                value={pct(data.unsubscribeRate)}
                note={`${num(data.last30Days.unsubscribed)} people in the last 30 days`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[18px] xl:flex-row">
            <Panel className="flex min-h-[360px] min-w-0 flex-1 flex-col gap-[18px]">
              <span className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="flex flex-col gap-[3px]">
                  <Mono>SUBSCRIBERS AND CONVERSIONS</Mono>
                  <span className="text-[13px] text-stone">Bars are new subscribers. The dot is the share who became users.</span>
                </span>
                <span className="flex gap-4 font-mono text-[9px] text-ash">
                  <span className="flex items-center gap-[7px]">
                    <span className="size-2 bg-ember/45" />
                    NEW
                  </span>
                  <span className="flex items-center gap-[7px]">
                    <span className="size-2 rounded-full" style={{ background: GREEN }} />
                    CONVERTED
                  </span>
                </span>
              </span>
              <GrowthChart growth={data.growth} />
            </Panel>

            <div className="flex flex-none flex-col gap-3.5 xl:w-[380px]">
              <Panel className="flex flex-col gap-3 p-5">
                <Mono>{data.lastIssue ? `LAST ISSUE · SENT ${day(data.lastIssue.sentAt).toUpperCase()}` : "LAST ISSUE"}</Mono>
                {data.lastIssue ? (
                  <>
                    <span className="font-serif text-2xl leading-[1.16] tracking-[-0.018em] text-cream text-pretty">{data.lastIssue.subject}</span>
                    <div className="flex gap-2.5">
                      {[
                        { v: pct(data.lastIssue.openRate), k: "OPENED", green: false },
                        { v: pct(data.lastIssue.clickRate), k: "CLICKED", green: false },
                        { v: num(data.lastIssue.signups), k: "SIGNUPS", green: true },
                      ].map((l) => (
                        <span key={l.k} className="flex flex-1 flex-col gap-0.5">
                          <span className="font-serif text-[22px] leading-none" style={{ color: l.green ? GREEN : "#f7f2e8" }}>{l.v}</span>
                          <span className="font-mono text-[8px] tracking-[0.12em] text-ash">{l.k}</span>
                        </span>
                      ))}
                    </div>
                    <ButtonLink href={`/issues/${data.lastIssue.id}`} className="h-10 rounded-full">
                      Open the report
                    </ButtonLink>
                  </>
                ) : (
                  <span className="text-sm leading-[1.55] text-ash">Nothing has gone out yet. The first broadcast will show up here.</span>
                )}
              </Panel>
              <Panel className="flex min-h-[200px] flex-1 flex-col gap-[11px] p-5">
                <Mono>SIGNED UP THIS WEEK</Mono>
                {data.recentConverts.length === 0 ? (
                  <span className="text-sm text-ash">No readers became users this week.</span>
                ) : (
                  data.recentConverts.map((r, i) => (
                    <div key={r.email} className="flex items-center gap-[11px]">
                      <span className="flex size-[26px] flex-none items-center justify-center rounded-full border border-[rgba(143,184,148,0.4)] bg-[rgba(111,152,115,0.2)] font-mono text-[9px]" style={{ color: GREEN }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] text-bone">{r.email}</span>
                        <span className="font-mono text-[9px] text-stone">SUBSCRIBED {ago(r.subscribedAt).toUpperCase()}</span>
                      </span>
                      <span className="font-mono text-[9px] text-ash">{ago(r.convertedAt)}</span>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          </div>
          <Link href="/conversions" className="self-start text-[13px] text-ash underline underline-offset-[3px] hover:text-bone">
            See every conversion →
          </Link>
        </div>
      )}
    </>
  );
}

function GrowthChart({ growth }: { growth: { month: Date | string; joined: number; conversionRate: number }[] }) {
  const max = Math.max(1, ...growth.map((g) => g.joined));
  const maxRate = Math.max(0.01, ...growth.map((g) => g.conversionRate));
  return (
    <div className="flex min-h-[240px] flex-1 items-end gap-2 border-b border-white/10 pb-0.5 sm:gap-3">
      {growth.map((g, i) => {
        const last = i === growth.length - 1;
        const height = Math.max(4, (g.joined / max) * 100);
        return (
          <span key={String(g.month)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${g.joined} new · ${pct(g.conversionRate)} converted`}>
            <span className="relative flex w-full flex-1 items-end">
              <span
                className="absolute left-1/2 z-[1] size-[9px] -translate-x-1/2 rounded-full border-2 border-charcoal"
                style={{ background: GREEN, bottom: `calc(${(g.conversionRate / maxRate) * 88}% - 4px)` }}
              />
              <span
                className="block w-full rounded-t-[5px] border"
                style={{
                  height: `${height}%`,
                  background: last ? "rgba(226,112,31,0.55)" : "rgba(226,112,31,0.3)",
                  borderColor: last ? "rgba(242,160,61,0.6)" : "rgba(242,160,61,0.28)",
                }}
              />
            </span>
            <span className={last ? "font-mono text-[9px] text-ember-glow" : "font-mono text-[9px] text-slate"}>
              {new Date(g.month).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
            </span>
          </span>
        );
      })}
    </div>
  );
}
