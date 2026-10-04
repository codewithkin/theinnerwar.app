"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ComputerIcon,
  FloppyDiskIcon,
  MailSend01Icon,
  Moon02Icon,
  Note03Icon,
  SentIcon,
  SidebarRight01Icon,
  SmartPhone01Icon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";
import { derivePreviewText, previewVerdict, subjectVerdict, titleOf } from "@theinnerwar.app/api/newsletter/analyze";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/icon";
import { Button, ButtonLink, GREEN, Loading, Mono, PageHeader } from "@/components/kit";
import { ago } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type View = "desktop" | "mobile" | "dark";
type Draft = { subject: string; previewText: string; body: string };

/** The subject a new issue starts with; it follows the `# Heading` until it is changed by hand. */
const UNTITLED = "Untitled issue";
const FOCUS_KEY = "dispatch.editor.focus";
/** In the writing view, the text sits in a centred ~820px column while the whole width still scrolls. */
const column = "px-[max(26px,calc((100%_-_820px)/2))]";

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const same = (a: Draft, b: Draft) => a.subject === b.subject && a.previewText === b.previewText && a.body === b.body;

// N3 · Editor: markdown left, the real email right.
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const issue = useQuery(trpc.dispatch.issue.queryOptions({ id }));

  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  /** The content as last stored on the server; "dirty" is anything different. */
  const [saved, setSaved] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"write" | "plain">("write");
  const [view, setView] = useState<View>("desktop");
  /** Writing view: the preview hidden and the editor full width. Remembered per browser. */
  const [focus, setFocus] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [, tick] = useState(0);
  const loaded = useRef(false);
  const gutter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (issue.data && !loaded.current) {
      loaded.current = true;
      const d = { subject: issue.data.subject, previewText: issue.data.previewText ?? "", body: issue.data.body };
      setSubject(d.subject);
      setPreviewText(d.previewText);
      setBody(d.body);
      setSaved(d);
      setSavedAt(new Date(issue.data.updatedAt));
    }
  }, [issue.data]);

  useEffect(() => {
    try {
      setFocus(window.localStorage.getItem(FOCUS_KEY) === "1");
    } catch {}
  }, []);
  const toggleFocus = () =>
    setFocus((f) => {
      try {
        window.localStorage.setItem(FOCUS_KEY, f ? "0" : "1");
      } catch {}
      return !f;
    });

  // Keeps "SAVED 4 SEC AGO" current.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const editable = issue.data ? issue.data.kind === "WELCOME" || issue.data.status === "DRAFT" : false;
  const draft: Draft = { subject, previewText, body };
  const dirty = saved !== null && !same(draft, saved);
  // Debounce a string so an unchanged draft never looks new (objects differ every render).
  const debouncedKey = useDebounced(JSON.stringify(draft), 700);
  const debounced = JSON.parse(debouncedKey) as Draft;

  const save = useMutation(
    trpc.dispatch.saveIssue.mutationOptions({
      onSuccess: (stored, vars) => {
        setSaved({ subject: vars.subject, previewText: vars.previewText ?? "", body: vars.body });
        setSavedAt(new Date(stored.updatedAt));
        queryClient.setQueryData(trpc.dispatch.issue.queryKey({ id }), stored);
        queryClient.invalidateQueries({ queryKey: trpc.dispatch.issues.queryKey() });
      },
    }),
  );

  const persist = (d: Draft) => save.mutateAsync({ id, subject: d.subject, previewText: d.previewText || null, body: d.body });

  /** Saves now if anything changed; false when there is nothing valid to save. */
  const flush = async () => {
    if (!editable || !dirty) return true;
    if (!subject.trim()) {
      toast.error("Add a subject before saving");
      return false;
    }
    try {
      await persist(draft);
      return true;
    } catch {
      return false;
    }
  };

  // Autosave after typing pauses, and again once an in-flight save settles if more changed.
  useEffect(() => {
    if (!loaded.current || !editable || !saved || save.isPending) return;
    if (same(debounced, saved) || !debounced.subject.trim()) return;
    // Don't retry a failed save of the same content in a loop; the next edit or Save tries again.
    const failed = save.isError ? save.variables : undefined;
    if (failed && same(debounced, { subject: failed.subject, previewText: failed.previewText ?? "", body: failed.body })) return;
    console.debug("[dispatch] autosave", { id, chars: debounced.body.length });
    persist(debounced).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey, save.isPending, saved]);

  const saveNow = () => flush().then((ok) => ok && toast.success("Saved", { id: "dispatch-save", duration: 1200 }));

  // Ctrl/⌘+S saves instead of opening the browser's "Save page" dialog; Ctrl/⌘+\ toggles the writing view.
  const shortcut = useRef<() => void>(() => {});
  useEffect(() => {
    shortcut.current = () => {
      if (editable) void saveNow();
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        shortcut.current();
      } else if (e.key === "\\" || e.code === "Backslash") {
        e.preventDefault();
        toggleFocus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

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
  const autoPreview = derivePreviewText(body);
  const previewHint = previewText.trim() ? previewVerdict(previewText) : null;
  const analysis = preview.data?.analysis;
  const lines = body.split("\n").length;

  const status = !editable
    ? `${i.status} · READ ONLY`
    : save.isPending
      ? "SAVING…"
      : save.isError && dirty
        ? "NOT SAVED"
        : dirty
          ? "UNSAVED CHANGES"
          : `${welcome ? "ALWAYS ON" : "DRAFT"} · SAVED ${savedAt ? ago(savedAt).toUpperCase() : ""}`;

  const flushAndGo = async (href: string) => {
    if (await flush()) router.push(href);
  };

  // While the subject still matches the title (or is the placeholder), retitling the issue renames it too.
  const onBodyChange = (next: string) => {
    const before = titleOf(body);
    const after = titleOf(next);
    if (editable && after && after !== before && (subject.trim() === UNTITLED || (before !== null && subject.trim() === before))) {
      setSubject(after);
    }
    setBody(next);
  };

  return (
    <div className="flex h-svh flex-col">
      <PageHeader
        onBack={() => flushAndGo("/issues")}
        title={`${label} · ${subject || "Untitled"}`}
        meta={<span className={cn(save.isError && dirty && "text-[#e0a294]", dirty && !save.isPending && !save.isError && "text-ember-pale")}>{status}</span>}
        actions={
          <>
            <span className="flex gap-1.5">
              {(["write", "plain"] as const).map((m) => (
                <Button key={m} variant={mode === m ? "soft" : "outline"} onClick={() => setMode(m)}>
                  <Icon icon={m === "write" ? Note03Icon : TextFontIcon} size={14} />
                  {m === "write" ? "Write" : "Plain text"}
                </Button>
              ))}
              <Button
                variant={focus ? "soft" : "outline"}
                title={`${focus ? "Show" : "Hide"} the live preview (Ctrl+\\)`}
                aria-pressed={focus}
                onClick={toggleFocus}
              >
                <Icon icon={SidebarRight01Icon} size={14} />
                {focus ? "Show preview" : "Writing view"}
              </Button>
            </span>
            <span className="hidden h-[22px] w-px bg-white/12 sm:block" />
            {editable ? (
              <Button
                variant="outline"
                title="Save (Ctrl+S)"
                pending={save.isPending}
                disabled={!dirty}
                onClick={saveNow}
              >
                {save.isPending ? null : <Icon icon={FloppyDiskIcon} size={14} />}
                {dirty || save.isPending ? "Save" : "Saved"}
              </Button>
            ) : null}
            <Button
              pending={test.isPending}
              onClick={async () => {
                if (await flush()) test.mutate({ id });
              }}
            >
              <Icon icon={MailSend01Icon} size={14} />
              Send a test
            </Button>
            {welcome ? (
              <ButtonLink href={`/issues/${id}`} variant="outline">Report</ButtonLink>
            ) : editable ? (
              <Button variant="ember" disabled={!subject.trim()} onClick={() => flushAndGo(`/issues/${id}/send`)}>
                Continue to send
                <Icon icon={SentIcon} size={14} />
              </Button>
            ) : (
              <ButtonLink href={`/issues/${id}`} variant="outline">Open the report</ButtonLink>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <section className={cn("flex min-h-[520px] flex-col border-white/8", focus ? "flex-1" : "xl:w-[640px] xl:flex-none xl:border-r")}>
          <div className={cn("flex flex-none flex-col gap-2.5 border-b border-white/7 px-[26px] pt-5 pb-3.5", focus && column)}>
            <label className="flex items-center gap-3">
              <Mono className="w-[58px] flex-none text-[9px] tracking-[0.14em] text-stone">SUBJECT</Mono>
              <input
                value={subject}
                readOnly={!editable}
                placeholder="What the inbox shows in bold"
                onChange={(e) => setSubject(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-bone outline-none placeholder:text-slate"
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
                placeholder={autoPreview || "The line inboxes show after the subject"}
                title={previewText ? undefined : "Left blank, inboxes show the opening paragraph"}
                onChange={(e) => setPreviewText(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-muted outline-none placeholder:text-slate placeholder:italic"
              />
              {previewHint ? (
                <span className={cn("flex-none font-mono text-[10px]", previewHint === "GOOD" ? "text-[#8fb894]" : "text-ember-pale")}>
                  {previewText.trim().length} CHARS · {previewHint}
                </span>
              ) : autoPreview ? (
                <span className="flex-none font-mono text-[10px] text-stone" title="Left blank, inboxes show the opening paragraph">
                  AUTO · FROM OPENING
                </span>
              ) : (
                <span className="flex-none font-mono text-[10px] text-ember-pale">EMPTY</span>
              )}
            </label>
          </div>

          {mode === "write" ? (
            <div className={cn("flex min-h-0 flex-1 overflow-hidden", focus && column)}>
              <div ref={gutter} aria-hidden="true" className="flex-none overflow-hidden py-5 pr-2 pl-[26px] text-right select-none">
                {Array.from({ length: lines }, (_, n) => (
                  <span key={n} className="block w-5 font-mono text-xs leading-[21px] text-[#3f3a34]">{n + 1}</span>
                ))}
              </div>
              <textarea
                value={body}
                readOnly={!editable}
                spellCheck
                onChange={(e) => onBodyChange(e.target.value)}
                onScroll={(e) => {
                  if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
                }}
                className="min-h-0 flex-1 resize-none bg-transparent py-5 pr-[26px] pl-2 font-mono text-[13px] leading-[21px] text-parchment outline-none"
              />
            </div>
          ) : (
            <pre className={cn("min-h-0 flex-1 overflow-auto px-[26px] py-5 font-mono text-[13px] leading-[21px] whitespace-pre-wrap text-parchment", focus && column)}>
              {preview.data?.text ?? ""}
            </pre>
          )}

          <div className={cn("flex h-10 flex-none items-center gap-5 border-t border-white/7 px-[26px] font-mono text-[10px] text-stone", focus && column)}>
            <span>{analysis?.words ?? 0} WORDS</span>
            <span>~{analysis?.readMinutes ?? 1} MIN READ</span>
            <span>{analysis?.links.length ?? 0} LINK{analysis?.links.length === 1 ? "" : "S"}</span>
            <span className="ml-auto" style={{ color: analysis?.pitchPresent ? GREEN : "#e0a294" }}>
              {analysis?.pitchPresent ? "PITCH PRESENT" : "NO LINK TO THE SITE"}
            </span>
          </div>
        </section>

        <section className={cn("flex min-h-[640px] min-w-0 flex-1 flex-col bg-[#0d0c0b]", focus && "hidden")}>
          <div className="flex h-[46px] flex-none items-center justify-between border-b border-white/7 px-6">
            <Mono className="text-[9px] text-stone">LIVE PREVIEW</Mono>
            <span className="flex gap-2">
              {(["desktop", "mobile", "dark"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "flex h-[26px] items-center gap-1.5 rounded-[7px] px-[11px] font-mono text-[9px]",
                    view === v ? "bg-white/8 text-parchment" : "text-stone hover:text-bone",
                  )}
                >
                  <Icon icon={v === "desktop" ? ComputerIcon : v === "mobile" ? SmartPhone01Icon : Moon02Icon} size={12} />
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
                "h-full min-h-[560px] flex-none border-0 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-[width]",
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
