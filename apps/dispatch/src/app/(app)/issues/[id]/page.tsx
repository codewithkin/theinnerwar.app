"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Bar, Button, ButtonLink, GREEN, Loading, Mono, Panel } from "@/components/kit";
import { dateTime, downloadCsv, num, pct, time } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const funnelStyle = [
  { bg: "rgba(226,112,31,0.4)", border: "rgba(242,160,61,0.4)" },
  { bg: "rgba(226,112,31,0.3)", border: "rgba(242,160,61,0.32)" },
  { bg: "rgba(226,112,31,0.22)", border: "rgba(242,160,61,0.26)" },
  { bg: "rgba(226,112,31,0.16)", border: "rgba(242,160,61,0.22)" },
  { bg: "rgba(111,152,115,0.3)", border: "rgba(143,184,148,0.45)" },
];

// N5 · Issue report: the funnel ends in signups, not opens.
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const report = useQuery(trpc.dispatch.report.queryOptions({ id }));
  const [viewing, setViewing] = useState(false);
  const email = useQuery({ ...trpc.dispatch.preview.queryOptions({ id }), enabled: viewing });
  const [exporting, setExporting] = useState(false);

  if (report.isLoading || !report.data) return <Loading />;
  const r = report.data;
  const welcome = r.issue.kind === "WELCOME";
  const maxOpens = Math.max(1, ...r.openCurve.map((h) => h.opens));
  const peakIndex = r.peak ? r.openCurve.findIndex((h) => new Date(h.hour).getTime() === new Date(r.peak!).getTime()) : -1;
  const maxClicks = Math.max(1, ...r.links.map((l) => l.count));
  const flexes = r.funnel.map((f) => Math.max(3, Math.round((f.value / Math.max(1, r.sentTo)) * 20)));

  return (
    <div className="flex flex-col gap-5 px-5 py-8 lg:px-9 lg:py-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <span className="flex min-w-0 flex-col gap-1.5">
          <Mono className="tracking-[0.2em] text-ember-glow">
            {welcome ? "WELCOME EMAIL · EVERY NEW SUBSCRIBER" : `ISSUE ${r.issue.number} · SENT ${dateTime(r.issue.sentAt).toUpperCase()} · TO ${num(r.sentTo)}`}
          </Mono>
          <h1 className="font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-paper text-pretty lg:text-[38px]">{r.issue.subject}</h1>
        </span>
        <span className="flex flex-none gap-2.5">
          <ButtonLink href={welcome ? `/issues/${id}/edit` : "/issues"} className="h-9">{welcome ? "Edit" : "All issues"}</ButtonLink>
          <Button className="h-9" onClick={() => setViewing(true)}>View the email</Button>
          <Button
            className="h-9"
            pending={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const csv = await queryClient.fetchQuery(trpc.dispatch.reportCsv.queryOptions({ id }));
                downloadCsv(`issue-${r.issue.number ?? "welcome"}.csv`, csv);
              } finally {
                setExporting(false);
              }
            }}
          >
            Export CSV
          </Button>
        </span>
      </div>

      <Panel className="flex flex-col gap-4 p-6">
        <Mono>FROM DELIVERED TO SIGNED UP</Mono>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-1">
          {r.funnel.map((f, i) => (
            <div key={f.key} className="flex min-w-0 flex-col gap-2.5" style={{ flex: flexes[i] }}>
              <span className="flex h-[76px] items-center rounded-md border px-4" style={{ background: funnelStyle[i]!.bg, borderColor: funnelStyle[i]!.border }}>
                <span className="font-serif text-[30px] leading-none text-paper">{num(f.value)}</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] tracking-[0.14em]" style={{ color: i === 4 ? GREEN : "#a79c8e" }}>{f.key}</span>
                <span className="font-mono text-[9px] text-slate">{i === 0 ? `${pct(f.rate)} of ${num(r.sentTo)}` : pct(f.rate, 2)}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-col gap-[18px] xl:flex-row">
        <Panel className="flex min-h-[320px] min-w-0 flex-1 flex-col gap-3.5">
          <Mono>{welcome ? "OPENS BY HOUR SINCE THE FIRST SEND" : "OPENS OVER THE FIRST TWELVE HOURS"}</Mono>
          <div className="flex min-h-[200px] flex-1 items-end gap-1.5 border-b border-white/10 pb-0.5 sm:gap-[9px]">
            {r.openCurve.map((h, i) => (
              <span key={String(h.hour)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${h.opens} opens`}>
                <span
                  className="w-full rounded-t-[5px] border border-ember-light/34"
                  style={{ height: `${Math.max(3, (h.opens / maxOpens) * 100)}%`, background: i === peakIndex ? "#e2701f" : "rgba(226,112,31,0.34)" }}
                />
                <span className="font-mono text-[9px]" style={{ color: i === peakIndex ? "#f0a557" : "#5c564d" }}>
                  {new Date(h.hour).toLocaleTimeString("en-US", { hour: "numeric" }).replace(" ", "").slice(0, -1)}
                </span>
              </span>
            ))}
          </div>
          <span className="text-[13px] text-stone">
            {r.peak ? `Peak at ${time(r.peak)}.` : "No opens recorded yet. Opens are counted when mail clients load images."}
          </span>
        </Panel>

        <Panel className="flex flex-none flex-col gap-[13px] xl:w-[420px]">
          <span className="flex items-baseline justify-between">
            <Mono>WHERE THEY CLICKED</Mono>
            <Mono className="text-stone">{num(r.totalClicks)} CLICKS</Mono>
          </span>
          {r.links.length === 0 ? (
            <span className="text-sm text-ash">No clicks yet.</span>
          ) : (
            r.links.slice(0, 6).map((l) => (
              <div key={l.url} className="flex flex-col gap-[7px]">
                <span className="flex items-baseline justify-between gap-3">
                  <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-bone hover:underline">{l.url.replace(/^https?:\/\//, "")}</a>
                  <span className="flex-none font-mono text-[11px]" style={{ color: l.toSite ? GREEN : "#a79c8e" }}>{num(l.count)}</span>
                </span>
                <Bar value={l.count / maxClicks} height={5} color={l.toSite ? GREEN : "rgba(226,112,31,0.5)"} />
              </div>
            ))
          )}
          <Panel tone="green" className="mt-auto flex flex-col gap-1 rounded-[14px] p-[15px]">
            <Mono className="text-[9px]" style={{ color: GREEN }}>ATTRIBUTED SIGNUPS</Mono>
            <span className="flex items-baseline gap-[9px]">
              <span className="font-serif text-[32px] leading-none text-cream">{num(r.signups)}</span>
              <span className="text-[13px] text-stone-muted">of {num(r.sentTo)} · {pct(r.sentTo ? r.signups / r.sentTo : 0, 2)}</span>
            </span>
            <span className="text-xs leading-[1.45] text-ash text-pretty">Matched by email address within seven days of opening or clicking this issue.</span>
          </Panel>
        </Panel>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-4 sm:p-10" onClick={() => setViewing(false)}>
          <div className="relative flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-[#e9e3d8]" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close" onClick={() => setViewing(false)} className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white">
              <X className="size-4" />
            </button>
            {email.data ? <iframe title="The email" sandbox="" srcDoc={email.data.html} className="h-full w-full flex-1 border-0" /> : <Loading />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
