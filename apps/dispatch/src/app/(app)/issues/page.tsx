"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ButtonLink, Empty, Flame, GREEN, Loading, PageHeader, Segmented, StatusPill } from "@/components/kit";
import { WriteIssueButton } from "@/components/write-issue";
import { dateTime, day, num, pct } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type Filter = "all" | "sent" | "scheduled" | "drafts";

const matches: Record<Filter, (status: string) => boolean> = {
  all: () => true,
  sent: (s) => s === "SENT",
  scheduled: (s) => s === "SCHEDULED" || s === "SENDING",
  drafts: (s) => s === "DRAFT",
};

/** Where a row leads: drafts to the editor, queued sends to preflight, sent issues to their report. */
function hrefFor(issue: { id: string; status: string }) {
  if (issue.status === "DRAFT") return `/issues/${issue.id}/edit`;
  if (issue.status === "SCHEDULED" || issue.status === "SENDING") return `/issues/${issue.id}/send`;
  return `/issues/${issue.id}`;
}

// N2 · Issues: the welcome email pinned above the broadcasts.
export default function IssuesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useQuery(trpc.dispatch.issues.queryOptions());

  const broadcasts = data?.broadcasts ?? [];
  const count = (f: Filter) => broadcasts.filter((b) => matches[f](b.status)).length;
  const rows = broadcasts.filter((b) => matches[filter](b.status));

  return (
    <>
      <PageHeader
        title="Issues"
        meta={data ? `${count("sent")} SENT · ${count("scheduled")} SCHEDULED · ${count("drafts")} DRAFTS` : undefined}
        actions={
          <>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "sent", label: "Sent" },
                { value: "scheduled", label: "Scheduled" },
                { value: "drafts", label: "Drafts" },
              ]}
            />
            <WriteIssueButton />
          </>
        }
      />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4 px-5 py-[22px] lg:px-7">
          <div className="flex flex-col gap-4 rounded-[18px] border border-ember-light/24 bg-ember/9 px-5 py-[18px] md:flex-row md:items-center md:gap-[22px]">
            <span className="flex size-[34px] flex-none items-center justify-center rounded-full border border-ember-light/40 bg-ember/20">
              <Flame size={13} />
            </span>
            <span className="flex flex-col gap-[3px] md:w-[320px] md:flex-none">
              <span className="font-mono text-[9px] tracking-[0.16em] text-ember-glow">WELCOME EMAIL · ALWAYS ON</span>
              <span className="font-serif text-[21px] leading-[1.12] text-cream">{data.welcome.subject}</span>
            </span>
            <span className="min-w-0 flex-1 text-sm leading-normal text-stone-muted text-pretty">
              Sent the moment someone joins. After this they simply join the next broadcast.
            </span>
            <span className="flex flex-none gap-[22px]">
              <span className="flex flex-col items-end gap-0.5">
                <span className="font-serif text-xl leading-none text-cream">{pct(data.welcome.openRate)}</span>
                <span className="font-mono text-[8px] tracking-[0.12em] text-ash">OPENED</span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="font-serif text-xl leading-none" style={{ color: GREEN }}>{pct(data.welcome.conversionRate)}</span>
                <span className="font-mono text-[8px] tracking-[0.12em] text-ash">CONVERTED</span>
              </span>
            </span>
            <span className="flex flex-none gap-2">
              <ButtonLink href={`/issues/${data.welcome.id}`} className="h-9">Report</ButtonLink>
              <ButtonLink href={`/issues/${data.welcome.id}/edit`} className="h-9 border-white/18 text-bone">Edit</ButtonLink>
            </span>
          </div>

          {rows.length === 0 ? (
            <Empty
              title={filter === "all" ? "No broadcasts yet." : `No ${filter} issues.`}
              body="Write an issue, send yourself a test, then schedule it for the usual slot."
              action={<WriteIssueButton />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className="text-left font-mono text-[9px] tracking-[0.14em] text-slate">
                    <th className="w-[52px] px-5 pb-3 font-normal">NO.</th>
                    <th className="pb-3 font-normal">SUBJECT</th>
                    <th className="w-[120px] pb-3 font-normal">STATUS</th>
                    <th className="w-[96px] pb-3 text-right font-normal">SENT TO</th>
                    <th className="w-[88px] pb-3 text-right font-normal">OPENED</th>
                    <th className="w-[96px] pb-3 text-right font-normal">SIGNUPS</th>
                    <th className="w-[130px] px-5 pb-3 text-right font-normal">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => {
                    const sent = i.status === "SENT";
                    const live = i.status === "SCHEDULED" || i.status === "SENDING";
                    const firstLine = i.body.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.replace(/[>*_[\]]/g, "").trim();
                    return (
                      <tr
                        key={i.id}
                        onClick={() => router.push(hrefFor(i))}
                        className={cn("cursor-pointer border-t border-white/7 hover:bg-white/[0.03]", live && "bg-ember/8")}
                      >
                        <td className="px-5 py-[15px] font-mono text-xs text-stone">{i.number ?? "—"}</td>
                        <td className="max-w-0 py-[15px] pr-5">
                          <span className={cn("block truncate text-[15px]", i.status === "DRAFT" ? "text-stone-muted" : "text-bone")}>{i.subject}</span>
                          <span className="block truncate text-xs text-stone">{i.previewText || firstLine || "Empty draft"}</span>
                        </td>
                        <td className="py-[15px]"><StatusPill status={i.status} /></td>
                        <td className="py-[15px] text-right font-mono text-xs text-stone-muted">{sent || i.status === "SENDING" ? num(i.recipientCount ?? i.sent) : "—"}</td>
                        <td className="py-[15px] text-right font-mono text-xs text-stone-muted">{sent ? pct(i.openRate) : "—"}</td>
                        <td className="py-[15px] text-right font-mono text-xs" style={{ color: sent ? GREEN : "#6b6558" }}>{sent ? num(i.signups) : "—"}</td>
                        <td className="px-5 py-[15px] text-right font-mono text-[11px] text-stone">
                          {sent ? day(i.sentAt) : live ? dateTime(i.scheduledFor) : `Edited ${day(i.updatedAt)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
