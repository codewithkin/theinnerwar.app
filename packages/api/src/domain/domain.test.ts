import { describe, expect, test } from "bun:test";

import { canOpenDay, hasPaidAccess } from "./access";
import { buildLedger, countHeld, localDate, shouldAdvance } from "./ledger";
import { recommendPath } from "./recommend";

const paths = [
  { slug: "defeat-resistance", bookSlug: "the-war-of-art", sortOrder: 1 },
  { slug: "govern-the-response", bookSlug: "meditations", sortOrder: 2 },
  { slug: "build-the-small-loop", bookSlug: "atomic-habits", sortOrder: 3 },
  { slug: "hold-the-aim", bookSlug: "think-and-grow-rich", sortOrder: 4 },
];

describe("recommendPath", () => {
  test("an explicit book choice wins", () => {
    const pick = recommendPath(
      { battles: ["procrastinating"], pattern: "overthink-first-step", bookSlug: "meditations" },
      paths,
    );
    expect(pick?.slug).toBe("govern-the-response");
  });

  test("the designed example lands on Defeat Resistance", () => {
    const pick = recommendPath(
      { battles: ["procrastinating", "not-finishing"], pattern: "overthink-first-step" },
      paths,
    );
    expect(pick?.slug).toBe("defeat-resistance");
  });

  test("the pattern outweighs a single battle", () => {
    const pick = recommendPath({ battles: ["procrastinating"], pattern: "lose-momentum" }, paths);
    expect(pick?.slug).toBe("build-the-small-loop");
  });

  test("no answers falls back to catalog order", () => {
    expect(recommendPath({ battles: [] }, [...paths].reverse())?.slug).toBe("defeat-resistance");
  });

  test("an unknown book slug is ignored", () => {
    const pick = recommendPath({ battles: ["reactive"], bookSlug: "deep-work" }, paths);
    expect(pick?.slug).toBe("govern-the-response");
  });

  test("empty catalog", () => {
    expect(recommendPath({ battles: [] }, [])).toBeNull();
  });
});

describe("buildLedger", () => {
  test("matches the landing page on day twelve", () => {
    const entries = Array.from({ length: 11 }, (_, i) => ({
      dayNumber: i + 1,
      status: i + 1 === 9 ? ("MISSED" as const) : ("KEPT" as const),
    }));
    const ledger = buildLedger({ lengthDays: 30, currentDay: 12, entries, chapterEndDay: 20 });
    expect(ledger).toHaveLength(30);
    expect(ledger[8]!.state).toBe("missed");
    expect(ledger[10]!.state).toBe("kept");
    expect(ledger[11]!.state).toBe("today");
    expect(ledger[19]!.state).toBe("open");
    expect(ledger[20]!.state).toBe("locked");
    expect(countHeld(ledger)).toEqual({ held: 10, reached: 12 });
  });

  test("a day with no entry before today counts as missed", () => {
    const ledger = buildLedger({ lengthDays: 3, currentDay: 2, entries: [] });
    expect(ledger.map((d) => d.state)).toEqual(["missed", "today", "locked"]);
  });
});

describe("day advance", () => {
  test("localDate respects the timezone", () => {
    const at = new Date("2026-09-19T02:00:00Z");
    expect(localDate(at, "UTC")).toBe("2026-09-19");
    expect(localDate(at, "America/New_York")).toBe("2026-09-18");
  });

  test("advances only on a later local day", () => {
    const keptAt = new Date("2026-09-18T21:00:00Z");
    const base = { currentDay: 1, lengthDays: 30, keptAt, timeZone: "UTC" };
    expect(shouldAdvance({ ...base, now: new Date("2026-09-18T23:59:00Z") })).toBe(false);
    expect(shouldAdvance({ ...base, now: new Date("2026-09-19T00:01:00Z") })).toBe(true);
    expect(shouldAdvance({ ...base, keptAt: null, now: new Date("2026-09-20T00:00:00Z") })).toBe(false);
    expect(shouldAdvance({ ...base, currentDay: 30, now: new Date("2026-09-20T00:00:00Z") })).toBe(false);
  });
});

describe("access", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const later = new Date("2026-10-01T00:00:00Z");
  const earlier = new Date("2026-09-01T00:00:00Z");

  test("free days are open without a plan", () => {
    expect(canOpenDay({ dayNumber: 3, freeDays: 3, entitlements: [], now })).toBe(true);
    expect(canOpenDay({ dayNumber: 4, freeDays: 3, entitlements: [], now })).toBe(false);
  });

  test("plan states", () => {
    const e = (over: Partial<Parameters<typeof hasPaidAccess>[0][number]>) => ({
      status: "ACTIVE" as const,
      plan: "MONTHLY" as const,
      trialEndsAt: null,
      currentPeriodEnd: later,
      ...over,
    });
    expect(hasPaidAccess([e({})], now)).toBe(true);
    expect(hasPaidAccess([e({ currentPeriodEnd: earlier })], now)).toBe(false);
    expect(hasPaidAccess([e({ status: "CANCELED" })], now)).toBe(true);
    expect(hasPaidAccess([e({ status: "TRIALING", trialEndsAt: earlier })], now)).toBe(false);
    expect(hasPaidAccess([e({ status: "EXPIRED" })], now)).toBe(false);
    expect(hasPaidAccess([e({ plan: "LIFETIME", currentPeriodEnd: null })], now)).toBe(true);
  });
});
