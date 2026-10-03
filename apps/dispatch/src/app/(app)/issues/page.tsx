"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import {
  Copy01Icon,
  Delete02Icon,
  Mail01Icon,
  MailOpen01Icon,
  PencilEdit02Icon,
  SentIcon,
  Timer02Icon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ButtonLink, Empty, Flame, GREEN, Loading, PageHeader, Segmented, StatusPill } from "@/components/kit";
import { Icon } from "@/components/icon";
import { WriteIssueButton } from "@/components/write-issue";
import { dateTime, day, nextSlot, num, pct } from "@/lib/format";
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

type Row = { id: string; status: string; subject: string; updatedAt: Date | string; lastTestAt: Date | string | null };

const iconButton =
  "flex size-8 items-center justify-center rounded-[8px] border border-transparent text-stone hover:border-white/14 hover:bg-white/5 hover:text-bone disabled:opacity-40";

/** Duplicate, delete, and "Send" (usual slot or now) without opening the issue. */
function RowActions({
  issue,
  audience,
  canSend,
  usualSlot,
}: {
  issue: Row;
  // Optional: an API deployed before quick-send doesn't return these, and the
  // button then falls back to opening the full send page.
  audience?: number;
  canSend?: boolean;
  usualSlot?: { day: number; time: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Viewport position of the open menu; fixed so the table's scroll box can't clip it.
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.issues.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.shell.queryKey() });
  };

  const duplicate = useMutation(
    trpc.dispatch.duplicateIssue.mutationOptions({
      onSuccess: (copy) => {
        refresh();
        router.push(`/issues/${copy.id}/edit`);
      },
    }),
  );
  const remove = useMutation(
    trpc.dispatch.deleteDraft.mutationOptions({
      onSuccess: () => {
        toast.success("Draft deleted");
        refresh();
      },
    }),
  );
  const schedule = useMutation(
    trpc.dispatch.schedule.mutationOptions({
      onSuccess: (s) => {
        toast.success(`Scheduled for ${dateTime(s.scheduledFor)}`);
        refresh();
      },
    }),
  );
  const sendNow = useMutation(
    trpc.dispatch.sendNow.mutationOptions({
      onSuccess: () => {
        toast.success("Sending has started");
        refresh();
      },
    }),
  );

  const draft = issue.status === "DRAFT";
  const quick = usualSlot !== undefined && audience !== undefined && canSend !== undefined;
  const slot = usualSlot ? nextSlot(usualSlot.day, usualSlot.time) : null;
  const people = `${num(audience)} ${audience === 1 ? "person" : "people"}`;
  const untested = !issue.lastTestAt || new Date(issue.lastTestAt) < new Date(issue.updatedAt);
  const warn = untested ? "\n\nYou haven't sent a test of this version yet." : "";
  const busy = duplicate.isPending || remove.isPending || schedule.isPending || sendNow.isPending;
  const option = "flex items-start gap-2.5 rounded-[8px] px-3 py-2.5 text-left hover:bg-white/6";

  return (
    // Clicks in here must not open the row.
    <span className="relative flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {draft ? (
        <button
          type="button"
          title={!quick ? "Send or schedule" : !canSend ? "SMTP is not configured" : audience === 0 ? "Nobody is on the list yet" : "Send or schedule"}
          aria-label="Send or schedule"
          aria-expanded={Boolean(menu)}
          disabled={busy || (quick && (!canSend || audience === 0))}
          onClick={(e) => {
            if (!quick) return router.push(`/issues/${issue.id}/send`);
            const r = e.currentTarget.getBoundingClientRect();
            // Open upward when there's no room below for the ~190px menu.
            const top = r.bottom + 200 > window.innerHeight ? r.top - 196 : r.bottom + 4;
            setMenu((m) => (m ? null : { top, right: window.innerWidth - r.right }));
          }}
          className={iconButton}
        >
          <Icon icon={SentIcon} size={15} />
        </button>
      ) : null}
      <button type="button" title="Duplicate" aria-label="Duplicate" disabled={busy} onClick={() => duplicate.mutate({ id: issue.id })} className={iconButton}>
        <Icon icon={Copy01Icon} size={15} />
      </button>
      {draft ? (
        <button
          type="button"
          title="Delete draft"
          aria-label="Delete draft"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete the draft “${issue.subject}”? This can't be undone.`)) remove.mutate({ id: issue.id });
          }}
          className={cn(iconButton, "hover:text-[#e0a294]")}
        >
          <Icon icon={Delete02Icon} size={15} />
        </button>
      ) : null}

      {menu && slot ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(null)} />
          <span style={{ top: menu.top, right: menu.right }} className="fixed z-30 flex w-[260px] flex-col rounded-[12px] border border-white/12 bg-charcoal p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              className={option}
              onClick={() => {
                setMenu(null);
                if (window.confirm(`Schedule “${issue.subject}” for ${dateTime(slot)} to ${people}?${warn}`)) {
                  schedule.mutate({ id: issue.id, at: slot });
                }
              }}
            >
              <Icon icon={Timer02Icon} size={15} className="mt-0.5 flex-none text-ember-glow" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-bone">Usual slot</span>
                <span className="font-mono text-[10px] text-stone">{dateTime(slot).toUpperCase()}</span>
              </span>
            </button>
            <button
              type="button"
              className={option}
              onClick={() => {
                setMenu(null);
                if (window.confirm(`Send “${issue.subject}” to ${people} now? There is no recall.${warn}`)) {
                  sendNow.mutate({ id: issue.id });
                }
              }}
            >
              <Icon icon={SentIcon} size={15} className="mt-0.5 flex-none text-ember-glow" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-bone">Send now</span>
                <span className="font-mono text-[10px] text-stone">TO {people.toUpperCase()}</span>
              </span>
            </button>
            <button
              type="button"
              className="rounded-[8px] px-3 py-2 text-left text-[13px] text-ash hover:bg-white/6 hover:text-bone"
              onClick={() => router.push(`/issues/${issue.id}/send`)}
            >
              Open the full checklist…
            </button>
          </span>
        </>
      ) : null}
    </span>
  );
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
              <ButtonLink href={`/issues/${data.welcome.id}`} className="h-9">
                <Icon icon={MailOpen01Icon} size={14} />
                Report
              </ButtonLink>
              <ButtonLink href={`/issues/${data.welcome.id}/edit`} className="h-9 border-white/18 text-bone">
                <Icon icon={PencilEdit02Icon} size={14} />
                Edit
              </ButtonLink>
            </span>
          </div>

          {rows.length === 0 ? (
            <Empty
              icon={Mail01Icon}
              title={filter === "all" ? "No broadcasts yet." : `No ${filter} issues.`}
              body="Write an issue, send yourself a test, then schedule it for the usual slot."
              action={<WriteIssueButton />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse">
                <thead>
                  <tr className="text-left font-mono text-[9px] tracking-[0.14em] text-slate">
                    <th className="w-[52px] px-5 pb-3 font-normal">NO.</th>
                    <th className="pb-3 font-normal">SUBJECT</th>
                    <th className="w-[120px] pb-3 font-normal">STATUS</th>
                    <th className="w-[96px] pb-3 text-right font-normal">SENT TO</th>
                    <th className="w-[88px] pb-3 text-right font-normal">OPENED</th>
                    <th className="w-[96px] pb-3 text-right font-normal">SIGNUPS</th>
                    <th className="w-[130px] pb-3 pl-5 text-right font-normal">DATE</th>
                    <th className="w-[124px] px-4 pb-3 font-normal"><span className="sr-only">Actions</span></th>
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
                        <td className="py-[15px] pl-5 text-right font-mono text-[11px] text-stone">
                          {sent ? day(i.sentAt) : live ? dateTime(i.scheduledFor) : `Edited ${day(i.updatedAt)}`}
                        </td>
                        <td className="px-4 py-[9px]">
                          <RowActions issue={i} audience={data.audience} canSend={data.canSend} usualSlot={data.usualSlot} />
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
