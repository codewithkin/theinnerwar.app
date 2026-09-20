"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon, Loading03Icon, LockKeyIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";
import { Flame, Mono } from "@/components/kit";
import { readSession, saveSession } from "@/lib/session";
import { serverUrl, trpc } from "@/lib/trpc";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation(
    trpc.dispatch.login.mutationOptions({
      onSuccess: (session) => {
        console.info("[dispatch] signed in, session until", session.expiresAt);
        saveSession({ token: session.token, expiresAt: new Date(session.expiresAt).toISOString() });
        router.replace("/");
      },
      onError: (error) => console.warn("[dispatch] sign-in failed", error.message),
    }),
  );

  useEffect(() => {
    if (readSession()) router.replace("/");
  }, [router]);

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-charcoal px-4 text-bone">
      <div className="pointer-events-none absolute -top-[300px] left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(226,112,31,0.2),transparent_72%)] blur-[12px]" />
      <form
        className="relative flex w-full max-w-[400px] flex-col gap-5 rounded-[26px] border border-white/10 bg-white/[0.045] p-8"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ email, password });
        }}
      >
        <span className="flex items-center gap-2.5">
          <Flame />
          <span className="font-serif text-[22px] text-cream">Dispatch</span>
        </span>
        <Mono className="-mt-3 text-[9px] text-slate">THE INNER WAR · INTERNAL</Mono>
        <label className="flex flex-col gap-2">
          <Mono className="text-[9px]">EMAIL</Mono>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-[10px] border border-white/10 bg-white/5 px-3.5 text-sm text-bone outline-none focus:border-ember-glow/60"
          />
        </label>
        <label className="flex flex-col gap-2">
          <Mono className="text-[9px]">PASSWORD</Mono>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-[10px] border border-white/10 bg-white/5 px-3.5 text-sm text-bone outline-none focus:border-ember-glow/60"
          />
        </label>
        {login.error ? (
          <p role="alert" className="flex items-center gap-2 text-[13px] text-[#e0a294]">
            <Icon icon={AlertCircleIcon} size={14} />
            {login.error.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={login.isPending}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-ember-gradient text-[15px] font-semibold text-button-ink hover:brightness-110 disabled:opacity-60"
        >
          <Icon icon={login.isPending ? Loading03Icon : LockKeyIcon} size={16} className={login.isPending ? "animate-spin" : undefined} />
          Sign in
        </button>
        <span className="font-mono text-[9px] text-slate">API · {serverUrl}</span>
      </form>
    </main>
  );
}
