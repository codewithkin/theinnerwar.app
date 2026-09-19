"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subjectVerdict } from "@theinnerwar.app/api/newsletter/analyze";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, ButtonLink, GREEN, Loading, Mono, PageHeader } from "@/components/kit";
import { ago } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type View = "desktop" | "mobile" | "dark";

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// N3 · Editor: markdown left, the real email right.
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const issue = useQuery(trpc.dispatch.issue.queryOptions({ id }));

  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"write" | "plain">("write");
  const [view, setView] = useState<View>("desktop");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [, tick] = useState(0);
  const loaded = useRef(false);
  const gutter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (issue.data && !loaded.current) {
      loaded.current = true;
      setSubject(issue.data.subject);
      setPreviewText(issue.data.previewText ?? "");
      setBody(issue.data.body);
      setSavedAt(new Date(issue.data.updatedAt));
    }
  }, [issue.data]);

  // Keeps "SAVED 4 SEC AGO" current.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const editable = issue.data ? issue.data.kind === "WELCOME" || issue.data.status === "DRAFT" : false;
  const draft = { subject, previewText, body };
  const debounced = useDebounced(draft, 700);

  const save = useMutation(
    trpc.dispatch.saveIssue.mutationOptions({
      onSuccess: (saved) => {
        setSavedAt(new Date(saved.updatedAt));
        queryClient.invalidateQueries({ queryKey: trpc.dispatch.issues.queryKey() });
      },
    }),
  );

  // Autosave after typing pauses.
  useEffect(() => {
    if (!loaded.current || !editable || !issue.data) return;
    const d = debounced;
    if (d.subject === issue.data.subject && (d.previewText || "") === (issue.data.previewText ?? "") && d.body === issue.data.body && !save.data) return;
    if (!d.subject.trim()) return;
    console.debug("[dispatch] autosave", { id, chars: d.body.length });
    save.mutate({ id, subject: d.subject, previewText: d.previewText || null, body: d.body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const preview = useQuery({
    ...trpc.dispatch.preview.queryOptions({ id, subject: debounced.subject, previewText: debounced.previewText || null, body: debounced.body }),
    enabled: loaded.current,
    placeholderData: keepPreviousData,
  });

  const test = useMutation(
    trpc.dispatch.sendTest.mutationOptions({
      onSuccess: ({ to }) => toast.success(`Test sent to ${to}`),
    }),
  );

  if (issue.isLoading || !issue.data) return <Loading />;
  const i = issue.data;
  const welcome = i.kind === "WELCOME";
  const label = welcome ? "Welcome email" : `Issue ${i.number ?? "draft"}`;
  const verdict = subjectVerdict(subject);
  const analysis = preview.data?.analysis;
  const lines = body.split("\n").length;
  const dirty = subject !== debounced.subject || body !== debounced.body || previewText !== debounced.previewText;

  const status = !editable
    ? `${i.status} · READ ONLY`
    : save.isPending || dirty
      ? "SAVING…"
      : save.isError
        ? "NOT SAVED"
        : `${welcome ? "ALWAYS ON" : "DRAFT"} · SAVED ${savedAt ? ago(savedAt).toUpperCase() : ""}`;

  const flushAndGo = async (href: string) => {
    if (editable && dirty) await save.mutateAsync({ id, subject, previewText: previewText || null, body });
    router.push(href);
  };

  return (
    <div className="flex h-svh flex-col">
      <PageHeader
        back="/issues"
        title={`${label} · ${subject || "Untitled"}`}
        meta={<span className={cn(save.isError && "text-[#e0a294]")}>{status}</span>}
        actions={
          <>
            <span className="flex gap-1.5">
              {(["write", "plain"] as const).map((m) => (
                <Button key={m} variant={mode === m ? "soft" : "outline"} onClick={() => setMode(m)}>
                  {m === "write" ? "Write" : "Plain text"}
                </Button>
              ))}
            </span>
            <span className="hidden h-[22px] w-px bg-white/12 sm:block" />
            <Button
              pending={test.isPending}
              onClick={async () => {
                if (editable && dirty) await save.mutateAsync({ id, subject, previewText: previewText || null, body });
                test.mutate({ id });
              }}
            >
              Send a test
            </Button>
            {welcome ? (
              <ButtonLink href={`/issues/${id}`} variant="outline">Report</ButtonLink>
            ) : editable ? (
              <Button variant="ember" onClick={() => flushAndGo(`/issues/${id}/send`)}>
                Continue to send
                <span className="size-[5px] rotate-45 border-t-[1.5px] border-r-[1.5px] border-button-ink" />
              </Button>
            ) : (
              <ButtonLink href={`/issues/${id}`} variant="outline">Open the report</ButtonLink>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <section className="flex min-h-[520px] flex-col border-white/8 xl:w-[640px] xl:flex-none xl:border-r">
          <div className="flex flex-none flex-col gap-2.5 border-b border-white/7 px-[26px] pt-5 pb-3.5">
            <label className="flex items-center gap-3">
              <Mono className="w-[58px] flex-none text-[9px] tracking-[0.14em] text-stone">SUBJECT</Mono>
              <input
                value={subject}
                readOnly={!editable}
                onChange={(e) => setSubject(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-bone outline-none"
              />
              <span className={cn("flex-none font-mono text-[10px]", verdict === "GOOD" ? "text-[#8fb894]" : "text-ember-pale")}>
                {subject.trim().length} CHARS · {verdict}
              </span>
            </label>
            <label className="flex items-center gap-3">
              <Mono className="w-[58px] flex-none text-[9px] tracking-[0.14em] text-stone">PREVIEW</Mono>
              <input
                value={previewText}
                readOnly={!editable}
                placeholder="The line inboxes show after the subject"
                onChange={(e) => setPreviewText(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-muted outline-none placeholder:text-slate"
              />
            </label>
          </div>

          {mode === "write" ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div ref={gutter} aria-hidden="true" className="flex-none overflow-hidden py-5 pr-2 pl-[26px] text-right select-none">
                {Array.from({ length: lines }, (_, n) => (
                  <span key={n} className="block w-5 font-mono text-xs leading-[21px] text-[#3f3a34]">{n + 1}</span>
                ))}
              </div>
              <textarea
                value={body}
                readOnly={!editable}
                spellCheck
                onChange={(e) => setBody(e.target.value)}
                onScroll={(e) => {
                  if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
                }}
                className="min-h-0 flex-1 resize-none bg-transparent py-5 pr-[26px] pl-2 font-mono text-[13px] leading-[21px] text-parchment outline-none"
              />
            </div>
          ) : (
            <pre className="min-h-0 flex-1 overflow-auto px-[26px] py-5 font-mono text-[13px] leading-[21px] whitespace-pre-wrap text-parchment">
              {preview.data?.text ?? ""}
            </pre>
          )}

          <div className="flex h-10 flex-none items-center gap-5 border-t border-white/7 px-[26px] font-mono text-[10px] text-stone">
            <span>{analysis?.words ?? 0} WORDS</span>
            <span>~{analysis?.readMinutes ?? 1} MIN READ</span>
            <span>{analysis?.links.length ?? 0} LINK{analysis?.links.length === 1 ? "" : "S"}</span>
            <span className="ml-auto" style={{ color: analysis?.pitchPresent ? GREEN : "#e0a294" }}>
              {analysis?.pitchPresent ? "PITCH PRESENT" : "NO LINK TO THE SITE"}
            </span>
          </div>
        </section>

        <section className="flex min-h-[640px] min-w-0 flex-1 flex-col bg-[#0d0c0b]">
          <div className="flex h-[46px] flex-none items-center justify-between border-b border-white/7 px-6">
            <Mono className="text-[9px] text-stone">LIVE PREVIEW</Mono>
            <span className="flex gap-2">
              {(["desktop", "mobile", "dark"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn("h-[26px] rounded-[7px] px-[11px] font-mono text-[9px]", view === v ? "bg-white/8 text-parchment" : "text-stone hover:text-bone")}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto px-4 py-[26px] sm:px-10">
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.data?.html ?? ""}
              className={cn(
                "h-full min-h-[560px] flex-none border-0 bg-[#e9e3d8] shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-[width]",
                view === "mobile" ? "w-[375px]" : "w-full max-w-[680px]",
                // Approximates how dark-mode mail clients invert a light email.
                view === "dark" && "[filter:invert(0.92)_hue-rotate(180deg)]",
              )}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
