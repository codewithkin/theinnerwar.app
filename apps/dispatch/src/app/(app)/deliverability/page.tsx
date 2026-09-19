"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

import { Bar, Button, GREEN, Loading, Mono, Panel, StatCard, StatusPill } from "@/components/kit";
import { ago, day, num, pct } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const REASONS = { HARD_BOUNCE: "Hard bounces", COMPLAINT: "Spam reports", MANUAL: "Manual removals" } as const;

// N8 · Deliverability: domain health and how the last send went.
export default function DeliverabilityPage() {
  const queryClient = useQueryClient();
  const d = useQuery(trpc.dispatch.deliverability.queryOptions());
  const [page, setPage] = useState(1);
  const list = useQuery(trpc.dispatch.suppressions.queryOptions({ page }));
  const [email, setEmail] = useState("");
  const refreshSuppressions = () => {
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.suppressions.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.dispatch.deliverability.queryKey() });
  };
  const suppress = useMutation(trpc.dispatch.suppress.mutationOptions({ onSuccess: () => { toast.success("Suppressed"); setEmail(""); refreshSuppressions(); } }));
  const unsuppress = useMutation(trpc.dispatch.unsuppress.mutationOptions({ onSuccess: () => { toast.success("Removed from the suppression list"); refreshSuppressions(); } }));

  if (d.isLoading || !d.data) return <Loading label="Checking DNS and delivery" />;
  const data = d.data;
  const failing = data.checks.filter((c) => c.status === "MISSING" || c.status === "UNKNOWN").length;
  const warnings = data.checks.filter((c) => c.status === "WARNING").length;
  const allGood = failing === 0 && data.stats.bounceRate < 0.02 && data.stats.failed === 0;

  return (
    <div className="flex flex-col gap-5 px-5 py-8 lg:px-9 lg:py-[34px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <span className="flex flex-col gap-[5px]">
          <Mono className="tracking-[0.2em]" style={{ color: allGood ? GREEN : "#e0a294" }}>
            {allGood ? (warnings ? `PASSING · ${warnings} TO REVIEW` : "ALL CHECKS PASSING") : `${failing || "SOME"} CHECK${failing === 1 ? "" : "S"} NEED ATTENTION`}
          </Mono>
          <h1 className="font-serif text-[34px] leading-[1.06] tracking-[-0.03em] text-paper lg:text-[38px]">
            {allGood ? "Your mail is arriving." : "Some mail may not be arriving."}
          </h1>
          <span className="text-[13px] text-stone">
            Sending domain {data.domain ?? "not set"} · checked {ago(data.checkedAt)}
          </span>
        </span>
        <Button pending={d.isFetching} onClick={() => d.refetch()}>Re-run checks</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="green" label="DELIVERED" value={pct(data.stats.deliveredRate)} note={`${num(data.stats.delivered)} of ${num(data.attempted)} ${data.scope.kind === "BROADCAST" ? `in issue ${data.scope.number}` : "welcome emails, last 30 days"}`} />
        <StatCard label="BOUNCE RATE" value={pct(data.stats.bounceRate, 2)} note={data.stats.bounceRate < 0.02 ? "Well under the 2% threshold" : "Above 2%: clean the list"} />
        <StatCard label="SPAM COMPLAINTS" value={pct(data.stats.complaintRate, 2)} note={`${num(data.stats.complaints)} reported`} />
        <StatCard label="FAILED TO SEND" value={num(data.stats.failed)} note="SMTP errors that weren't bounces" />
      </div>

      <div className="flex flex-col gap-[18px] xl:flex-row">
        <Panel className="flex flex-none flex-col px-[22px] py-1.5 xl:w-[520px]">
          <Mono className="pt-[18px] pb-2.5">DOMAIN AUTHENTICATION</Mono>
          {data.checks.map((c) => (
            <div key={c.key} className="flex min-h-[68px] items-center gap-3.5 border-t border-white/7 py-3">
              <span
                className={cn(
                  "flex size-6 flex-none items-center justify-center rounded-full border text-[11px]",
                  c.status === "PASSING" && "border-[rgba(143,184,148,0.4)] bg-[rgba(111,152,115,0.18)] text-[#8fb894]",
                  c.status === "WARNING" && "border-ember-light/40 bg-ember/15 text-ember-pale",
                  (c.status === "MISSING" || c.status === "UNKNOWN") && "border-[rgba(190,90,68,0.4)] bg-[rgba(110,42,28,0.3)] text-[#e0a294]",
                )}
              >
                {c.status === "PASSING" ? "✓" : c.status === "WARNING" ? "!" : "×"}
              </span>
              <span className="w-[62px] flex-none font-mono text-xs text-bone">{c.key}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] text-ash" title={c.value}>{c.value}</span>
                {c.note ? <span className="text-[11px] text-ember-pale">{c.note}</span> : null}
              </span>
              <StatusPill status={c.status} className="h-auto border-0 bg-transparent px-0" />
            </div>
          ))}
          {data.domain === "gmail.com" ? (
            <p className="border-t border-white/7 py-3 text-xs leading-normal text-stone text-pretty">
              You are sending through a Gmail account, so these are Google&apos;s records. Move to your own domain for your own
              SPF, DKIM and DMARC, and for sending beyond Gmail&apos;s daily limit.
            </p>
          ) : null}
        </Panel>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Panel className="flex flex-col gap-3.5">
            <Mono>
              HOW THE LAST SEND WENT
              {data.scope.kind === "BROADCAST" ? ` · ISSUE ${data.scope.number}, ${day(data.scope.sentAt)}` : " · WELCOME EMAILS, 30 DAYS"}
            </Mono>
            <div className="flex flex-col gap-[13px]">
              {data.outcome.map((o, i) => (
                <div key={o.key} className="flex flex-col gap-[7px]">
                  <span className="flex items-baseline justify-between">
                    <span className="text-sm text-parchment">{o.key}</span>
                    <span className="font-mono text-xs" style={{ color: i === 0 ? GREEN : "#a79c8e" }}>
                      {num(o.value)} · {pct(o.share)}
                    </span>
                  </span>
                  <Bar value={o.share} color={i === 0 ? GREEN : i === 1 ? "rgba(226,112,31,0.5)" : "rgba(255,255,255,0.22)"} />
                </div>
              ))}
            </div>
            <span className="text-xs leading-normal text-stone text-pretty">
              Whether mail lands in the inbox, Promotions or spam can&apos;t be measured from here; it needs a seed-list
              placement test. Opens only count when images load.
            </span>
          </Panel>

          <Panel className="flex flex-col gap-[11px] p-5">
            <Mono>SUPPRESSED ADDRESSES</Mono>
            {(Object.keys(REASONS) as (keyof typeof REASONS)[]).map((r) => (
              <span key={r} className="flex items-baseline justify-between">
                <span className="text-sm text-parchment">{REASONS[r]}</span>
                <span className="font-mono text-xs text-ash">{num(data.suppressed[r])}</span>
              </span>
            ))}
            <form
              className="mt-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) suppress.mutate({ email: email.trim() });
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Suppress an address"
                className="h-[34px] min-w-0 flex-1 rounded-[9px] border border-white/10 bg-white/5 px-3 text-[13px] text-bone outline-none placeholder:text-stone focus:border-ember-glow/50"
              />
              <Button type="submit" pending={suppress.isPending}>Suppress</Button>
            </form>
            {list.data && list.data.rows.length ? (
              <div className="flex flex-col">
                {list.data.rows.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 border-t border-white/6 py-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-bone">{s.email}</span>
                    <span className="font-mono text-[9px] text-stone">{s.reason.replace("_", " ")}</span>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Allow mail to ${s.email} again?`) && unsuppress.mutate({ email: s.email })}
                      className="text-xs text-ash underline underline-offset-2 hover:text-bone"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {list.data.total > 20 ? (
                  <span className="flex justify-between pt-2 font-mono text-[10px] text-stone">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-30">← PREV</button>
                    <span>{num(list.data.total)} TOTAL</span>
                    <button type="button" disabled={page * 20 >= list.data.total} onClick={() => setPage(page + 1)} className="disabled:opacity-30">NEXT →</button>
                  </span>
                ) : null}
              </div>
            ) : null}
            <span className="mt-1 text-xs leading-normal text-stone text-pretty">
              Suppressed addresses never receive mail again, even if re-imported.
            </span>
          </Panel>
        </div>
      </div>
    </div>
  );
}
