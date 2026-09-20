"use client";

import { useMutation } from "@tanstack/react-query";
import { EmberMark } from "@theinnerwar.app/ui/components/ember-mark";
import { Eyebrow } from "@theinnerwar.app/ui/components/eyebrow";
import { pillButtonVariants } from "@theinnerwar.app/ui/components/pill-button";
import { cn } from "@theinnerwar.app/ui/lib/utils";
import { CheckmarkCircle02Icon, Loading03Icon, Unlink01Icon } from "@hugeicons/core-free-icons";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Icon } from "@/components/icon";
import { trpc } from "@/utils/trpc";

// The footer link in every letter lands here. Unsubscribing happens on load,
// in the browser, so link scanners that only fetch the page don't trigger it.
export function UnsubscribeCard() {
  const token = useSearchParams().get("t") ?? "";
  const unsubscribe = useMutation(trpc.newsletter.unsubscribe.mutationOptions());
  const resubscribe = useMutation(trpc.newsletter.resubscribe.mutationOptions());
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    unsubscribe.mutate({ token });
  }, [token, unsubscribe]);

  if (resubscribe.isSuccess) {
    return (
      <Card icon={<EmberMark className="size-5" />} tone="ember">
        <Eyebrow>BACK ON THE LIST</Eyebrow>
        <Title>Good to have you back.</Title>
        <Body>Letters will reach {resubscribe.data.email} again from this Sunday.</Body>
        <HomeLink />
      </Card>
    );
  }

  if (!token || unsubscribe.isError) {
    return (
      <Card icon={<Icon icon={Unlink01Icon} size={20} className="text-[#e0a294]" />} tone="warn">
        <Eyebrow tone="muted">LINK NOT VALID</Eyebrow>
        <Title>We couldn't read that link.</Title>
        <Body>
          Use the unsubscribe link at the bottom of any letter, or reply to a letter and ask. We will
          take you off by hand.
        </Body>
        <HomeLink />
      </Card>
    );
  }

  if (!unsubscribe.isSuccess) {
    return (
      <Card icon={<Icon icon={Loading03Icon} size={20} className="animate-spin text-parchment" />} tone="stone">
        <Eyebrow tone="muted">ONE MOMENT</Eyebrow>
        <Title>Taking you off the list.</Title>
      </Card>
    );
  }

  return (
    <Card icon={<Icon icon={CheckmarkCircle02Icon} size={20} className="text-parchment" />} tone="stone">
      <Eyebrow tone="muted">UNSUBSCRIBED</Eyebrow>
      <Title>You're off the list.</Title>
      <Body>
        No more letters will go to {unsubscribe.data.email}. It stopped immediately, as promised.
      </Body>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={resubscribe.isPending}
          onClick={() => resubscribe.mutate({ token })}
          className={pillButtonVariants({ size: "sm", className: "shadow-none" })}
        >
          {resubscribe.isPending ? <Icon icon={Loading03Icon} size={16} className="animate-spin" /> : null}
          I changed my mind
        </button>
        <HomeLink inline />
      </div>
      {resubscribe.isError ? (
        <p className="text-[13px] text-[#e0a294]">That didn't work. Try again in a moment.</p>
      ) : null}
    </Card>
  );
}

function Card({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "ember" | "stone" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-[520px] animate-in flex-col gap-3 rounded-[26px] border p-7 duration-300 fade-in zoom-in-95 sm:p-9",
        tone === "ember"
          ? "border-ember-light/28 bg-[linear-gradient(150deg,rgba(226,112,31,0.16),rgba(255,255,255,0.03))]"
          : tone === "warn"
            ? "border-[rgba(190,90,68,0.35)] bg-[rgba(110,42,28,0.14)]"
            : "border-white/12 bg-white/[0.045]",
      )}
    >
      <span
        className={cn(
          "mb-2 flex size-12 items-center justify-center rounded-full border",
          tone === "ember"
            ? "border-ember-light/40 bg-ember/16"
            : tone === "warn"
              ? "border-[rgba(190,90,68,0.4)] bg-[rgba(110,42,28,0.3)]"
              : "border-white/16 bg-white/5",
        )}
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="display text-[34px] leading-[1.08] tracking-[-0.025em] text-paper sm:text-[40px]">
      {children}
    </h1>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.6] text-sand text-pretty">{children}</p>;
}

function HomeLink({ inline }: { inline?: boolean }) {
  return (
    <a
      href="/"
      className={cn("text-sm text-ash underline underline-offset-[3px] hover:text-bone", !inline && "mt-2")}
    >
      Back to The Inner War
    </a>
  );
}
