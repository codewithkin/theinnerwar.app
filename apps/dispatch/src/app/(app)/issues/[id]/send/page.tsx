"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Bar, Button, ButtonLink, Flame, GREEN, Loading, Mono, Panel } from "@/components/kit";
import { ago, dateTime, nextSlot, num, pct, time, WEEKDAYS } from "@/lib/format";
import { trpc } from "@/lib/trpc";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// N4 · Preflight: the last screen before it is irreversible.
export default function SendPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const pre = useQuery(trpc.dispatch.preflight.queryOptions({ id }));
  const status = pre.data?.issue.status;
  const inFlight = status === "SENDING" || status === "SENT";
  const progress = useQuery({
    ...trpc.dispatch.sendProgress.queryOptions({ id }),
    enabled: inFlight,
    refetchInterval: status === "SENDING" ? 5000 : false,
  });

  const [mode, setMode] = useState<"schedule" | "now">("schedule");
  const [when, setWhen] = useState("");
  useEffect(() => {
    if (pre.data && !when) {
      setWhen(toLocalInput(nextSlot(pre.data.settings.usualSlotDay, pre.data.settings.usualSlotTime)));
    }
  }, [pre.data, when]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.preflight.queryKey({ id }) });
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.shell.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.issues.queryKey() });
  };
  const schedule = useMutation(trpc.dispatch.schedule.mutationOptions({ onSuccess: () => { toast.success("Scheduled"); refresh(); } }));
  const cancel = useMutation(trpc.dispatch.cancelSchedule.mutationOptions({ onSuccess: () => { toast.success("Schedule stopped, back to draft"); refresh(); } }));
  const sendNow = useMutation(trpc.dispatch.sendNow.mutationOptions({ onSuccess: () => { toast.success("Sending has started"); refresh(); } }));
  const test = useMutation(trpc.dispatch.sendTest.mutationOptions({ onSuccess: ({ to }) => { toast.success(`Test sent to ${to}`); refresh(); } }));

  if (pre.isLoading || !pre.data) return <Loading />;
  const { issue, audience, settings, analysis, recent, canSend } = pre.data;
  const siteLinks = analysis.links.length;
  const scheduledAt = when ? new Date(when) : null;

  const checks = [
    { k: "AUDIENCE", v: `Everyone on the list: ${num(audience)} ${audience === 1 ? "person" : "people"}`, ok: audience > 0, action: { label: "Change", href: "/subscribers" } },
    { k: "SUBJECT", v: issue.subject, ok: issue.subject.trim().length > 0 && issue.subject.length <= 50, action: { label: "Edit", href: `/issues/${id}/edit` } },
    { k: "PREVIEW TEXT", v: issue.previewText || "Missing: inboxes will show the first line instead", ok: Boolean(issue.previewText), action: { label: "Edit", href: `/issues/${id}/edit` } },
    { k: "TEST SENT", v: issue.lastTestAt ? `To ${issue.lastTestTo}, ${ago(issue.lastTestAt)}` : "No test yet this draft", ok: Boolean(issue.lastTestAt && new Date(issue.lastTestAt) >= new Date(issue.updatedAt)), action: { label: issue.lastTestAt ? "Resend" : "Send", onClick: () => test.mutate({ id }) } },
    { k: "LINKS", v: siteLinks ? `${siteLinks} link${siteLinks === 1 ? "" : "s"}: ${analysis.links.slice(0, 2).join(", ")}` : "No links", ok: siteLinks > 0, action: { label: "Check", href: `/issues/${id}/edit` } },
    { k: "THE PITCH", v: analysis.pitchPresent ? "Present: a link back to the site" : "Missing: nothing links back to the site", ok: analysis.pitchPresent, action: { label: "Read", href: `/issues/${id}/edit` } },
  ];

  const maxOpen = Math.max(0.01, ...recent.map((r) => r.openRate));
  const bestSignups = Math.max(0, ...recent.map((r) => r.signups));
  const arrival = scheduledAt && mode === "schedule" ? time(scheduledAt).toUpperCase() : "NOW";

  return (
    <div className="flex min-h-svh flex-col xl:flex-row">
      <section className="flex min-w-0 flex-1 flex-col gap-6 px-5 py-10 lg:px-14 lg:py-12">
        <div className="flex items-center gap-4">
          <Link href={`/issues/${id}/edit`} aria-label="Back to the editor" className="flex size-[34px] items-center justify-center rounded-[9px] border border-white/14">
            <span className="-ml-0.5 size-[7px] rotate-45 border-b-[1.6px] border-l-[1.6px] border-parchment" />
          </Link>
          <Mono className="tracking-[0.2em] text-ember-glow">
            ISSUE {issue.number ?? "—"} · {status === "DRAFT" ? "READY TO SEND" : status}
          </Mono>
        </div>
        <h1 className="max-w-[700px] font-serif text-[40px] leading-[1.04] tracking-[-0.035em] text-paper text-pretty lg:text-5xl">
          {status === "SENT"
            ? `“${issue.subject}” went to ${num(issue.recipientCount ?? 0)} people.`
            : status === "SENDING"
              ? `Sending “${issue.subject}” now.`
              : status === "SCHEDULED"
                ? `“${issue.subject}” goes out ${dateTime(issue.scheduledFor)}.`
                : `Sending “${issue.subject}” to ${num(audience)} ${audience === 1 ? "person" : "people"}.`}
        </h1>

        {inFlight ? (
          <Panel className="flex flex-col gap-4">
            <Mono>DELIVERY</Mono>
            {(() => {
              const total = progress.data?.total ?? issue.recipientCount ?? 0;
              const by = progress.data?.byStatus ?? {};
              const done = (by.SENT ?? 0) + (by.FAILED ?? 0) + (by.BOUNCED ?? 0);
              return (
                <>
                  <Bar value={total ? done / total : 0} height={8} color="linear-gradient(90deg,#f2a03d,#e2701f)" />
                  <span className="flex flex-wrap gap-6 font-mono text-xs text-stone-muted">
                    <span>{num(by.SENT ?? 0)} SENT</span>
                    <span>{num((by.QUEUED ?? 0) + (by.SENDING ?? 0))} WAITING</span>
                    <span className="text-[#e0a294]">{num((by.FAILED ?? 0) + (by.BOUNCED ?? 0))} FAILED</span>
                    <span>OF {num(total)}</span>
                  </span>
                </>
              );
            })()}
            <span className="text-[13px] text-ash">
              Sending runs in batches of a few dozen a minute, so a large list takes a while. This page updates itself.
            </span>
            <ButtonLink href={`/issues/${id}`} className="self-start">Open the report</ButtonLink>
          </Panel>
        ) : (
          <>
            <Panel className="px-6 py-1.5">
              {checks.map((c) => (
                <div key={c.k} className="flex min-h-[66px] flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/7 py-3 last:border-b-0">
                  <span
                    className={cn(
                      "flex size-6 flex-none items-center justify-center rounded-full border text-[11px]",
                      c.ok ? "border-[rgba(143,184,148,0.4)] bg-[rgba(111,152,115,0.18)] text-[#8fb894]" : "border-ember-light/40 bg-ember/15 text-ember-pale",
                    )}
                  >
                    {c.ok ? "✓" : "!"}
                  </span>
                  <Mono className="w-[150px] flex-none text-[9px] tracking-[0.14em] text-stone">{c.k}</Mono>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-bone">{c.v}</span>
                  {"href" in c.action ? (
                    <Link href={c.action.href!} className="flex-none text-[13px] text-ash underline underline-offset-[3px] hover:text-bone">{c.action.label}</Link>
                  ) : (
                    <button type="button" onClick={c.action.onClick} disabled={test.isPending || !canSend} className="flex-none text-[13px] text-ash underline underline-offset-[3px] hover:text-bone disabled:opacity-40">
                      {test.isPending ? "Sending…" : c.action.label}
                    </button>
                  )}
                </div>
              ))}
            </Panel>

            {status === "SCHEDULED" ? (
              <Panel tone="ember" className="flex flex-wrap items-center justify-between gap-4">
                <span className="flex flex-col gap-1">
                  <span className="text-base text-bone">Scheduled for {dateTime(issue.scheduledFor)}</span>
                  <span className="text-[13px] text-stone-muted">You can stop it until one minute before it goes.</span>
                </span>
                <Button variant="danger" pending={cancel.isPending} onClick={() => cancel.mutate({ id })}>Stop and return to draft</Button>
              </Panel>
            ) : (
              <div className="flex flex-col gap-4">
                <label className={cn("flex cursor-pointer flex-wrap items-center gap-[18px]", mode !== "schedule" && "opacity-60")}>
                  <input type="radio" name="when" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="size-[22px] accent-[#e2701f]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base text-bone">Schedule for {scheduledAt ? dateTime(scheduledAt) : "…"}</span>
                    <span className="text-[13px] text-stone-muted">
                      Your usual slot is {WEEKDAYS[settings.usualSlotDay]} at {settings.usualSlotTime}, your time.
                    </span>
                  </span>
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => {
                      setWhen(e.target.value);
                      setMode("schedule");
                    }}
                    className="h-[38px] rounded-[9px] border border-white/18 bg-transparent px-3 font-mono text-[13px] text-bone [color-scheme:dark]"
                  />
                </label>
                <label className={cn("flex cursor-pointer items-center gap-[18px]", mode !== "now" && "opacity-60")}>
                  <input type="radio" name="when" checked={mode === "now"} onChange={() => setMode("now")} className="size-[22px] accent-[#e2701f]" />
                  <span className="text-[15px] text-stone-muted">Send immediately instead</span>
                </label>
              </div>
            )}

            {status === "DRAFT" ? (
              <div className="mt-auto flex flex-wrap items-center gap-3.5 pt-4">
                {mode === "schedule" ? (
                  <Button
                    variant="ember"
                    size="lg"
                    pending={schedule.isPending}
                    disabled={!scheduledAt}
                    onClick={() => scheduledAt && schedule.mutate({ id, at: scheduledAt })}
                  >
                    Schedule this issue
                  </Button>
                ) : (
                  <Button
                    variant="ember"
                    size="lg"
                    pending={sendNow.isPending}
                    disabled={!canSend}
                    onClick={() => {
                      if (window.confirm(`Send “${issue.subject}” to ${audience} people now? There is no recall.`)) sendNow.mutate({ id });
                    }}
                  >
                    Send it now
                  </Button>
                )}
                <Button size="lg" className="rounded-full px-6" pending={test.isPending} disabled={!canSend} onClick={() => test.mutate({ id })}>
                  Send one more test
                </Button>
                <Link href={`/issues/${id}/edit`} className="text-sm text-ash underline underline-offset-[3px] hover:text-bone sm:ml-auto">Back to the editor</Link>
                {!canSend ? <span className="w-full text-[13px] text-[#e0a294]">SMTP is not configured on the server, so nothing can be sent.</span> : null}
              </div>
            ) : null}
          </>
        )}
      </section>

      <aside className="flex flex-col gap-[18px] border-white/8 bg-[#0d0c0b] px-5 py-10 xl:w-[480px] xl:flex-none xl:border-l xl:px-9">
        <Mono className="text-stone">HOW IT WILL ARRIVE</Mono>
        <div className="flex items-start gap-[13px] rounded-[14px] border border-white/10 bg-white/5 p-4">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-full border border-ember-light/40 bg-ember/18">
            <Flame size={13} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-bone">{settings.fromName}</span>
              <span className="font-mono text-[10px] text-stone">{status === "SCHEDULED" ? time(issue.scheduledFor!).toUpperCase() : arrival}</span>
            </span>
            <span className="truncate text-sm text-bone">{issue.subject}</span>
            <span className="text-[13px] leading-[1.4] text-ash text-pretty">{issue.previewText || "No preview text set."}</span>
          </span>
        </div>

        <Mono className="text-stone">WHAT THE LAST SIX DID</Mono>
        <div className="rounded-2xl border border-white/9 bg-white/[0.04] px-[18px] py-1">
          {recent.length === 0 ? (
            <p className="py-4 text-[13px] text-ash">Nothing has been sent yet.</p>
          ) : (
            recent.map((r) => (
              <div key={r.id} className="flex h-[52px] items-center gap-3.5 border-b border-white/6 last:border-b-0">
                <span className="w-6 flex-none font-mono text-[11px] text-stone">{r.number}</span>
                <Bar className="min-w-0 flex-1" value={r.openRate / maxOpen} color={r.signups === bestSignups && bestSignups > 0 ? "#e2701f" : "rgba(226,112,31,0.42)"} />
                <span className="w-[46px] flex-none text-right font-mono text-[11px] text-stone-muted">{pct(r.openRate)}</span>
                <span className="w-[34px] flex-none text-right font-mono text-[11px]" style={{ color: GREEN }}>{r.signups}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-dashed border-white/16 p-4">
          <Mono className="text-[9px]">ONCE IT GOES</Mono>
          <span className="text-[13px] leading-normal text-ash text-pretty">
            There is no recall. You can stop a scheduled send up to one minute before it goes.
          </span>
        </div>
      </aside>
    </div>
  );
}
