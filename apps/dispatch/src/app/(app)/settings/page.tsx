"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Loading, Mono, Panel } from "@/components/kit";
import { WEEKDAYS } from "@/lib/format";
import { trpc } from "@/lib/trpc";

type Form = {
  fromName: string;
  fromAddress: string;
  replyTo: string;
  dkimSelector: string;
  usualSlotDay: number;
  usualSlotTime: string;
  footer: string;
};

const input =
  "h-10 w-full min-w-0 rounded-[10px] border border-white/10 bg-white/5 px-3.5 text-sm text-parchment outline-none placeholder:text-slate focus:border-ember-glow/50";

// N9 · Settings: sending identity, with the footer previewed live.
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(trpc.dispatch.settings.queryOptions());
  const shell = useQuery(trpc.dispatch.shell.queryOptions());
  const [form, setForm] = useState<Form | null>(null);
  const [footerDebounced, setFooterDebounced] = useState("");

  useEffect(() => {
    if (settings.data && !form) {
      const s = settings.data;
      setForm({
        fromName: s.fromName,
        fromAddress: s.fromAddress ?? "",
        replyTo: s.replyTo ?? "",
        dkimSelector: s.dkimSelector ?? "",
        usualSlotDay: s.usualSlotDay,
        usualSlotTime: s.usualSlotTime,
        footer: s.footer,
      });
      setFooterDebounced(s.footer);
    }
  }, [settings.data, form]);

  useEffect(() => {
    if (!form) return;
    const t = setTimeout(() => setFooterDebounced(form.footer), 400);
    return () => clearTimeout(t);
  }, [form]);

  const footerPreview = useQuery({
    ...trpc.dispatch.previewFooter.queryOptions({ footer: footerDebounced }),
    enabled: Boolean(footerDebounced),
    placeholderData: keepPreviousData,
  });

  const save = useMutation(
    trpc.dispatch.saveSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Settings saved");
        queryClient.invalidateQueries({ queryKey: trpc.dispatch.settings.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.dispatch.deliverability.queryKey() });
      },
    }),
  );
  const test = useMutation(trpc.dispatch.sendSettingsTest.mutationOptions({ onSuccess: ({ to }) => toast.success(`Welcome email sent to ${to}`) }));

  if (!form || settings.isLoading) return <Loading />;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });
  const footerOk = /\{\{\s*unsubscribe_url\s*\}\}/.test(form.footer);

  const rows: { k: string; hint: string; field: React.ReactNode }[] = [
    { k: "From name", hint: "Shown in the inbox", field: <input className={input} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} /> },
    {
      k: "From address",
      hint: "Blank uses MAIL_FROM on the server",
      field: <input className={input} type="email" placeholder="letters@innerwar.app" value={form.fromAddress} onChange={(e) => set("fromAddress", e.target.value)} />,
    },
    { k: "Reply-to", hint: "Replies come here", field: <input className={input} type="email" placeholder="hello@innerwar.app" value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} /> },
    {
      k: "DKIM selector",
      hint: "For the deliverability check",
      field: <input className={input} placeholder="e.g. google, dispatch" value={form.dkimSelector} onChange={(e) => set("dkimSelector", e.target.value)} />,
    },
    {
      k: "Usual slot",
      hint: "Default for new issues, your time",
      field: (
        <span className="flex w-full gap-2">
          <select className={input} value={form.usualSlotDay} onChange={(e) => set("usualSlotDay", Number(e.target.value))}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i} className="bg-charcoal">{d}</option>
            ))}
          </select>
          <input className={`${input} max-w-[140px] [color-scheme:dark]`} type="time" value={form.usualSlotTime} onChange={(e) => set("usualSlotTime", e.target.value)} />
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 py-8 lg:px-11 lg:py-10">
      <h1 className="font-serif text-[34px] leading-[1.08] tracking-[-0.028em] text-paper">Settings</h1>

      <Panel className="px-6 py-1">
        {rows.map((r) => (
          <div key={r.k} className="flex flex-col gap-2 border-b border-white/7 py-4 last:border-b-0 sm:min-h-[72px] sm:flex-row sm:items-center sm:gap-5 sm:py-0">
            <span className="flex flex-col gap-0.5 sm:w-[190px] sm:flex-none">
              <span className="text-[15px] text-bone">{r.k}</span>
              <span className="text-xs text-stone">{r.hint}</span>
            </span>
            {r.field}
          </div>
        ))}
      </Panel>

      <div className="flex flex-col gap-[18px] xl:flex-row">
        <Panel className="flex min-w-0 flex-1 flex-col gap-3">
          <Mono>FOOTER, ON EVERY ISSUE</Mono>
          <textarea
            value={form.footer}
            onChange={(e) => set("footer", e.target.value)}
            rows={6}
            className="min-h-[160px] flex-1 resize-y rounded-xl border border-white/9 bg-white/[0.04] p-4 font-mono text-[13px] leading-[1.7] text-parchment outline-none focus:border-ember-glow/50"
          />
          <span className={footerOk ? "text-xs leading-normal text-stone" : "text-xs leading-normal text-[#e0a294]"}>
            {footerOk
              ? "The pitch is not here. You write it fresh at the end of each issue. {{ unsubscribe_url }} becomes each reader's own link."
              : "The footer must include {{ unsubscribe_url }}: every email needs a working unsubscribe link."}
          </span>
        </Panel>
        <div className="flex flex-col gap-3.5 rounded-[20px] bg-[#f7f3ec] p-6 xl:w-[420px] xl:flex-none">
          <span className="font-mono text-[9px] tracking-[0.18em] text-[#8a7f6d]">AS THE READER SEES IT</span>
          <iframe title="Footer preview" sandbox="" srcDoc={footerPreview.data ?? ""} className="h-[220px] w-full border-0" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ember"
          size="lg"
          className="h-12 px-[26px] text-[15px]"
          pending={save.isPending}
          disabled={!footerOk}
          onClick={() =>
            save.mutate({
              fromName: form.fromName,
              fromAddress: form.fromAddress.trim() || null,
              replyTo: form.replyTo.trim() || null,
              dkimSelector: form.dkimSelector.trim() || null,
              usualSlotDay: form.usualSlotDay,
              usualSlotTime: form.usualSlotTime,
              footer: form.footer,
            })
          }
        >
          Save settings
        </Button>
        <Button size="lg" className="h-12 rounded-full px-[22px] text-sm" pending={test.isPending} disabled={shell.data?.canSend === false} onClick={() => test.mutate()}>
          Send myself a test
        </Button>
        {shell.data?.canSend === false ? <span className="text-[13px] text-[#e0a294]">SMTP isn&apos;t configured on the server.</span> : null}
      </div>
    </div>
  );
}
