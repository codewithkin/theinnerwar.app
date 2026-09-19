"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Bar, GREEN, Loading, Mono, Panel, Segmented, StatCard } from "@/components/kit";
import { num, pct } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type Range = "all" | "quarter" | "month";

// N7 · Conversions: is this newsletter actually working?
export default function ConversionsPage() {
  const [range, setRange] = useState<Range>("all");
  const { data, isLoading } = useQuery({ ...trpc.dispatch.conversions.queryOptions({ range }), placeholderData: keepPreviousData });

  if (isLoading || !data) return <Loading />;
  const maxSignups = Math.max(1, ...data.attribution.map((a) => a.signups));
  const topBucket = Math.max(...data.buckets.map((b) => b.count));
  const rangeLabel = range === "all" ? "all time" : range === "quarter" ? "this quarter" : "this month";

  return (
    <div className="flex flex-col gap-5 px-5 py-8 lg:px-9 lg:py-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <span className="flex flex-col gap-[5px]">
          <Mono className="tracking-[0.2em] text-ember-glow">SUBSCRIBERS WHO BECAME USERS</Mono>
          <h1 className="font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-paper lg:text-[38px]">
            {num(data.convertedTotal)} of {num(data.audience)} have signed up.
          </h1>
        </span>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: "all", label: "All time" },
            { value: "quarter", label: "This quarter" },
            { value: "month", label: "This month" },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="ember" label="CONVERSION RATE" value={pct(data.conversionRate)} note="All subscribers who now have an account" />
        <StatCard label={`SIGNUPS ${range === "all" ? "ALL TIME" : range === "quarter" ? "THIS QUARTER" : "THIS MONTH"}`} value={num(data.signups)} note={`From ${num(data.joined)} new subscribers ${rangeLabel}`} />
        <StatCard
          label="ISSUES BEFORE SIGNUP"
          value={data.medianIssuesBeforeSignup === null ? "—" : String(Math.round(data.medianIssuesBeforeSignup * 10) / 10)}
          note={data.signups ? `Median across ${num(data.signups)}` : "No signups in this range"}
        />
        <StatCard
          tone="green"
          label="BEST ISSUE"
          value={data.best ? num(data.best.signups) : "—"}
          note={data.best ? `No. ${data.best.number}, ${data.best.subject}` : "No broadcast signups yet"}
        />
      </div>

      <div className="flex flex-col gap-[18px] xl:flex-row">
        <Panel className="flex min-w-0 flex-1 flex-col gap-3.5">
          <span className="flex items-baseline justify-between gap-3">
            <Mono>WHICH ISSUE BROUGHT THEM</Mono>
            <Mono className="text-stone">SIGNUPS WITHIN 7 DAYS</Mono>
          </span>
          <div className="flex flex-col gap-[11px]">
            {data.attribution.length === 0 ? (
              <span className="text-sm text-ash">No broadcasts sent yet.</span>
            ) : (
              data.attribution.map((a) => {
                const best = data.best?.id === a.id;
                return (
                  <Link key={a.id} href={`/issues/${a.id}`} className="flex items-center gap-3.5 hover:opacity-90">
                    <span className="w-7 flex-none font-mono text-[11px] text-stone">{a.number}</span>
                    <span className="w-[140px] flex-none truncate text-sm text-parchment sm:w-[240px]">{a.subject}</span>
                    <Bar className="min-w-0 flex-1 rounded" height={22} value={a.signups / maxSignups} color={best ? GREEN : "rgba(226,112,31,0.42)"} />
                    <span className="w-10 flex-none text-right font-mono text-[13px]" style={{ color: best ? GREEN : "#a79c8e" }}>{num(a.signups)}</span>
                  </Link>
                );
              })
            )}
            {data.welcomeSignups ? (
              <span className="flex items-center gap-3.5">
                <span className="w-7 flex-none font-mono text-[11px] text-stone">W</span>
                <span className="w-[140px] flex-none truncate text-sm text-parchment sm:w-[240px]">Welcome email</span>
                <Bar className="min-w-0 flex-1 rounded" height={22} value={data.welcomeSignups / Math.max(maxSignups, data.welcomeSignups)} color="rgba(255,255,255,0.2)" />
                <span className="w-10 flex-none text-right font-mono text-[13px] text-stone-muted">{num(data.welcomeSignups)}</span>
              </span>
            ) : null}
          </div>
          <span className="mt-auto text-[13px] leading-normal text-stone text-pretty">{data.insights.bestIssue}</span>
        </Panel>

        <Panel className="flex flex-none flex-col gap-3.5 xl:w-[400px]">
          <Mono>HOW LONG THEY READ FIRST</Mono>
          <div className="flex flex-col gap-3">
            {data.buckets.map((b) => {
              const top = b.count === topBucket && b.count > 0;
              return (
                <div key={b.key} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between">
                    <span className="text-sm text-parchment">{b.key}</span>
                    <span className="font-mono text-xs" style={{ color: top ? GREEN : "#a79c8e" }}>{pct(b.share, 0)}</span>
                  </span>
                  <Bar value={b.share} color={top ? GREEN : b.key.startsWith("On the welcome") ? "rgba(255,255,255,0.2)" : "rgba(226,112,31,0.42)"} />
                </div>
              );
            })}
          </div>
          <Panel tone="green" className="mt-auto flex flex-col gap-[5px] rounded-[14px] p-4">
            <Mono className="text-[9px]" style={{ color: GREEN }}>THE PATTERN</Mono>
            <span className="text-sm leading-[1.55] text-parchment text-pretty">{data.insights.pattern}</span>
          </Panel>
        </Panel>
      </div>
    </div>
  );
}
