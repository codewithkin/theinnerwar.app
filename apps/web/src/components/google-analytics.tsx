"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-WF1ZSK7XE7";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  // gtag('config') already sends the first page_view; only later navigations need this.
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    track("page_view", { page_path: pathname });
  }, [pathname]);

  // CTA clicks are delegated so any element can opt in with data-cta="placement:label".
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const element = (event.target as Element | null)?.closest<HTMLElement>("[data-cta]");
      if (!element) return;
      const [placement, ...label] = (element.dataset.cta ?? "").split(":");
      track("cta_click", {
        placement,
        cta: label.join(":") || undefined,
        destination: element.getAttribute("href") ?? undefined,
      });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Reports each page section once, when it reaches the middle of the viewport.
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = entry.target as HTMLElement;
          track("section_view", { section: section.id });
          observer.unobserve(section);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
