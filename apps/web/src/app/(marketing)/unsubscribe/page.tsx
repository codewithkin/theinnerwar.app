import { Wordmark } from "@theinnerwar.app/ui/components/ember-mark";
import type { Metadata } from "next";
import { Suspense } from "react";

import { UnsubscribeCard } from "./unsubscribe-card";

export const metadata: Metadata = {
  title: "Unsubscribe · The Inner War",
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <main className="dark relative flex min-h-svh flex-col items-center overflow-hidden bg-night px-4 font-sans text-bone">
      <div className="pointer-events-none absolute -top-[320px] left-1/2 h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(226,112,31,0.22),transparent_72%)] blur-[12px]" />
      <a href="/" className="relative mt-10 mb-auto" aria-label="The Inner War, home">
        <Wordmark />
      </a>
      <div className="relative flex w-full justify-center py-16">
        <Suspense>
          <UnsubscribeCard />
        </Suspense>
      </div>
      <div className="mt-auto" />
    </main>
  );
}
