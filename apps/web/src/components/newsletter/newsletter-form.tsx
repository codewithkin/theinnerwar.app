"use client";

import { useMutation } from "@tanstack/react-query";
import { EmberMark } from "@theinnerwar.app/ui/components/ember-mark";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { TRPCClientError } from "@trpc/client";
import { AlertCircle, ArrowRight, Check, Loader2, RotateCcw } from "lucide-react";
import { useId, useRef, useState } from "react";

import { trpc } from "@/utils/trpc";

// The one call to action on the site until the app opens: an email + button
// pair that joins "The Inner War" letters and sends the welcome email at once.

type Success = { state: "subscribed" | "already" | "resubscribed"; email: string; emailSent: boolean };
type Failure = { kind: "invalid" | "limited" | "undeliverable" | "network"; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function signupMeta(source: string) {
  const params = new URLSearchParams(window.location.search);
  const utm = (key: string) => params.get(`utm_${key}`)?.slice(0, 200) || undefined;
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  return {
    source,
    pagePath: window.location.pathname,
    referrer: document.referrer || undefined,
    utmSource: utm("source"),
    utmMedium: utm("medium"),
    utmCampaign: utm("campaign"),
    utmTerm: utm("term"),
    utmContent: utm("content"),
    timezone,
  };
}

function toFailure(error: unknown): Failure {
  if (error instanceof TRPCClientError) {
    const code = (error.data as { code?: string } | undefined)?.code;
    if (code === "TOO_MANY_REQUESTS") return { kind: "limited", message: error.message };
    if (code === "BAD_REQUEST") {
      // Zod errors arrive as JSON; the server's own messages are already readable.
      return error.message.startsWith("[")
        ? { kind: "invalid", message: "That doesn't look like an email address." }
        : { kind: "undeliverable", message: error.message };
    }
  }
  return { kind: "network", message: "We couldn't reach the list just now." };
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, Math.min(2, Math.max(1, name.length - 1)))}•••@${domain}`;
}

const copy = {
  subscribed: (s: Success) => ({
    eyebrow: "CHECK YOUR INBOX",
    title: s.emailSent ? "Your first letter is on its way." : "You're on the list.",
    body: s.emailSent
      ? `Sent to ${maskEmail(s.email)}. If it isn't there in a minute, look in Promotions or spam and move it to your inbox.`
      : `${maskEmail(s.email)} is on the list. The welcome letter is running late, but Sunday's letter will reach you.`,
  }),
  already: (s: Success) => ({
    eyebrow: "ALREADY ON THE LIST",
    title: "You're already in.",
    body: `Letters go to ${maskEmail(s.email)} every Sunday. You'll hear there first when the app opens.`,
  }),
  resubscribed: (s: Success) => ({
    eyebrow: "WELCOME BACK",
    title: "Good to have you back.",
    body: s.emailSent
      ? `Letters will reach ${maskEmail(s.email)} again from this Sunday. A short welcome note is on its way.`
      : `Letters will reach ${maskEmail(s.email)} again from this Sunday.`,
  }),
};

export function NewsletterForm({
  source,
  size = "md",
  buttonLabel = "Join",
  note,
  className,
  id,
}: {
  /** Which placement this is, e.g. "hero" or "pricing-lifetime"; stored on the subscriber. */
  source: string;
  size?: "md" | "lg";
  buttonLabel?: string;
  note?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const subscribe = useMutation(
    trpc.newsletter.subscribe.mutationOptions({
      onSuccess: (data) => setSuccess(data),
      onError: (error) => setFailure(toFailure(error)),
    }),
  );

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setFailure({ kind: "invalid", message: "That doesn't look like an email address." });
      inputRef.current?.focus();
      return;
    }
    setFailure(null);
    subscribe.mutate({ email: value, company: company || undefined, ...signupMeta(source) });
  }

  function reset() {
    setSuccess(null);
    setFailure(null);
    setEmail("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (success) {
    const text = copy[success.state](success);
    const positive = success.state !== "already";
    return (
      <div id={id} className={cn("w-full max-w-[520px]", className)}>
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex animate-in items-start gap-4 rounded-[22px] border p-[18px] duration-300 fade-in zoom-in-95",
            positive
              ? "border-ember-light/28 bg-[linear-gradient(150deg,rgba(226,112,31,0.16),rgba(255,255,255,0.03))]"
              : "border-white/12 bg-white/[0.045]",
          )}
        >
          <span
            className={cn(
              "relative flex size-11 flex-none items-center justify-center rounded-full border",
              positive ? "border-ember-light/40 bg-ember/16" : "border-white/16 bg-white/5",
            )}
          >
            {positive ? (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-ember/20 [animation-iteration-count:2]" />
                <EmberMark className="size-[18px]" />
              </>
            ) : (
              <Check className="size-[18px] text-parchment" strokeWidth={1.8} />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              className={cn(
                "font-mono text-[9px] tracking-[0.18em]",
                positive ? "text-ember-glow" : "text-stone-muted",
              )}
            >
              {text.eyebrow}
            </span>
            <span className="font-serif text-[22px] leading-[1.15] tracking-[-0.015em] text-cream">
              {text.title}
            </span>
            <p className="text-sm leading-[1.55] text-sand text-pretty">{text.body}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-1 flex items-center gap-1.5 self-start text-[13px] text-ash underline underline-offset-[3px] hover:text-bone"
            >
              <RotateCcw className="size-3" />
              Use a different address
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pending = subscribe.isPending;
  const large = size === "lg";

  return (
    <form
      id={id}
      noValidate
      onSubmit={submit}
      className={cn("flex w-full max-w-[520px] flex-col gap-3", className)}
    >
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border bg-white/[0.045] p-1.5 transition-[border-color,background-color,box-shadow] duration-200",
          "focus-within:border-ember-glow/60 focus-within:bg-white/[0.07] focus-within:shadow-[0_0_0_4px_rgba(226,112,31,0.12)]",
          failure ? "border-[#c98070]/60" : "border-white/14",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          disabled={pending}
          aria-invalid={failure?.kind === "invalid" || undefined}
          aria-describedby={failure ? `${inputId}-error` : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (failure) setFailure(null);
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent pl-4 text-bone outline-none placeholder:text-ash disabled:opacity-60",
            large ? "h-12 text-base sm:pl-5" : "h-10 text-[15px]",
          )}
        />
        {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute -left-[9999px] h-px w-px opacity-0"
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "group flex flex-none items-center justify-center gap-2 rounded-full bg-ember-gradient font-semibold text-button-ink shadow-[0_10px_26px_rgba(226,112,31,0.28)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:brightness-90",
            large ? "h-12 px-6 text-[15px] sm:px-7" : "h-10 px-5 text-sm",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="sr-only sm:not-sr-only">Joining</span>
            </>
          ) : (
            <>
              {/* Phones get the short label so the address has room. */}
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">{buttonLabel}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      {failure ? (
        <div
          id={`${inputId}-error`}
          role="alert"
          className="flex animate-in items-start gap-2 pl-4 text-[13px] leading-normal text-[#e0a294] duration-200 fade-in slide-in-from-top-1"
        >
          <AlertCircle className="mt-0.5 size-3.5 flex-none" />
          <span>
            {failure.message}
            {failure.kind === "network" ? (
              <>
                {" "}
                <button type="button" onClick={() => submit()} className="underline underline-offset-2 hover:text-bone">
                  Try again
                </button>
              </>
            ) : null}
          </span>
        </div>
      ) : note ? (
        <p className="pl-4 text-xs leading-normal text-stone text-pretty">{note}</p>
      ) : null}
    </form>
  );
}
