"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import {
  Download01Icon,
  Search01Icon,
  Upload01Icon,
  UserGroupIcon,
  UserMinus01Icon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/icon";
import { Button, Empty, GREEN, Loading, PageHeader, Segmented, StatusPill } from "@/components/kit";
import { ago, day, downloadCsv, num } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type View = "everyone" | "users" | "reading" | "neverOpened" | "unsubscribed";
const VIEWS: { value: View; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "users", label: "Became users" },
  { value: "reading", label: "Still reading" },
  { value: "neverOpened", label: "Never opened" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

const dotColor: Record<string, string> = {
  USER: GREEN,
  READING: "rgba(226,112,31,0.5)",
  COLD: "rgba(255,255,255,0.14)",
};

// N6 · Subscribers: a laurel-green mark means they became a user.
export default function SubscribersPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("everyone");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery({
    ...trpc.dispatch.subscribers.queryOptions({ view, search: query || undefined, page }),
    placeholderData: keepPreviousData,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.dispatch.subscribers.queryKey() });

  const importCsv = useMutation(
    trpc.dispatch.importSubscribers.mutationOptions({
      onSuccess: (r) => {
        toast.success(`Imported ${r.imported}. Skipped ${r.alreadySubscribed} already subscribed, ${r.suppressed} suppressed, ${r.invalid} invalid.`);
        invalidate();
      },
    }),
  );
  const remove = useMutation(
    trpc.dispatch.removeSubscriber.mutationOptions({
      onSuccess: () => {
        toast.success("Removed from the list");
        invalidate();
      },
    }),
  );
  const [exporting, setExporting] = useState(false);

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <>
      <PageHeader
        title="Subscribers"
        meta={data ? `${num(data.views.everyone - data.views.unsubscribed)} ACTIVE` : undefined}
        actions={
          <>
            <label className="flex h-[34px] w-full items-center gap-2.5 rounded-[9px] border border-white/9 bg-white/6 px-3 sm:w-[280px]">
              <Icon icon={Search01Icon} size={14} className="text-ash" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-bone outline-none placeholder:text-stone"
              />
            </label>
            <Button
              pending={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const csv = await queryClient.fetchQuery(trpc.dispatch.exportSubscribers.queryOptions({ view }));
                  downloadCsv(`subscribers-${view}.csv`, csv);
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Icon icon={Download01Icon} size={14} />
              Export
            </Button>
            <Button pending={importCsv.isPending} onClick={() => fileInput.current?.click()}>
              <Icon icon={Upload01Icon} size={14} />
              Import CSV
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const csv = await file.text();
                if (window.confirm(`Import subscribers from ${file.name}? They won't receive the welcome email.`)) {
                  importCsv.mutate({ csv, source: `import:${file.name}`.slice(0, 60) });
                }
              }}
            />
          </>
        }
      />

      <div className="flex flex-none flex-wrap items-center gap-3 border-b border-white/7 px-5 py-3.5 lg:px-7">
        <Segmented
          value={view}
          onChange={(v) => {
            setView(v);
            setPage(1);
          }}
          options={VIEWS.map((v) => ({ ...v, count: data?.views[v.value] }))}
        />
      </div>

      {list.isLoading || !data ? (
        <Loading />
      ) : data.rows.length === 0 ? (
        <div className="p-7">
          <Empty icon={UserGroupIcon} title={query ? "Nobody matches that search." : "No one here yet."} body="Signups from the website land here the moment they happen." />
        </div>
      ) : (
        <>
          <div className={cn("overflow-x-auto transition-opacity", list.isFetching && "opacity-70")}>
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="text-left font-mono text-[9px] tracking-[0.14em] text-slate">
                  <th className="px-7 py-3.5 font-normal">EMAIL</th>
                  <th className="w-[130px] font-normal">STATUS</th>
                  <th className="w-[120px] font-normal">SUBSCRIBED</th>
                  <th className="w-[110px] text-right font-normal">ISSUES SENT</th>
                  <th className="w-[100px] text-right font-normal">OPENED</th>
                  <th className="w-[150px] text-right font-normal">LAST SEEN</th>
                  <th className="w-[64px] px-7 font-normal" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => {
                  const user = s.tag === "USER";
                  const cold = s.tag === "COLD";
                  return (
                    <tr key={s.id} className={cn("group border-t border-white/6", user && "bg-[rgba(111,152,115,0.06)]")}>
                      <td className="max-w-0 px-7 py-[13px]">
                        <span className="flex items-center gap-3">
                          <span className="size-2 flex-none rounded-full" style={{ background: dotColor[s.tag] ?? "rgba(255,255,255,0.14)" }} />
                          <span className="truncate text-sm text-bone">{s.email}</span>
                        </span>
                      </td>
                      <td><StatusPill status={s.tag} className="h-[22px] px-[9px]" /></td>
                      <td className="font-mono text-[11px] text-ash">{day(s.subscribedAt)}</td>
                      <td className="text-right font-mono text-[11px] text-ash">{num(s.issuesSent)}</td>
                      <td className={cn("text-right font-mono text-[11px]", cold ? "text-stone" : "text-stone-muted")}>{num(s.issuesOpened)}</td>
                      <td className="text-right font-mono text-[11px] text-stone">
                        {s.convertedAt ? `Signed up ${ago(s.convertedAt)}` : s.lastOpenedAt ? `Opened ${ago(s.lastOpenedAt)}` : s.status === "ACTIVE" ? "Never opened" : `Left ${ago(s.unsubscribedAt)}`}
                      </td>
                      <td className="px-7 text-right">
                        {s.status === "ACTIVE" ? (
                          <button
                            type="button"
                            title="Remove from the list"
                            aria-label={`Remove ${s.email}`}
                            onClick={() => window.confirm(`Remove ${s.email} from the list?`) && remove.mutate({ id: s.id })}
                            className="rounded-md p-1.5 text-stone opacity-0 group-hover:opacity-100 hover:bg-white/5 hover:text-[#e0a294] focus:opacity-100"
                          >
                            <Icon icon={UserMinus01Icon} size={14} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-auto flex h-[52px] flex-none items-center justify-between border-t border-white/8 px-5 lg:px-7">
            <span className="font-mono text-[10px] text-stone">SHOWING {num(from)}–{num(to)} OF {num(data.total)}</span>
            <span className="flex gap-1.5">
              <PageButton disabled={page <= 1} onClick={() => setPage(page - 1)}>←</PageButton>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const start = Math.min(Math.max(1, page - 2), Math.max(1, pages - 4));
                const n = start + i;
                return (
                  <PageButton key={n} active={n === page} onClick={() => setPage(n)}>{n}</PageButton>
                );
              })}
              <PageButton disabled={page >= pages} onClick={() => setPage(page + 1)}>→</PageButton>
            </span>
          </div>
        </>
      )}
    </>
  );
}

function PageButton({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-[30px] items-center justify-center rounded-lg border font-mono text-[11px] disabled:opacity-30",
        active ? "border-ember-light/32 bg-ember/16 text-ember-pale" : "border-white/14 text-stone-muted hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}
