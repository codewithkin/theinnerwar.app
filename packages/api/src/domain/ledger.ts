// The ledger: one mark per campaign day (landing "THE LEDGER", B1 day map).

export type LedgerState = "kept" | "missed" | "today" | "open" | "locked";

export type LedgerEntry = { dayNumber: number; status: "OPEN" | "KEPT" | "MISSED" };

export type LedgerDay = { dayNumber: number; state: LedgerState };

/**
 * Days before `currentDay` are kept or missed (missed if never kept); the
 * current day is today; the rest of its chapter is open, later chapters locked.
 */
export function buildLedger(input: {
  lengthDays: number;
  currentDay: number;
  entries: readonly LedgerEntry[];
  chapterEndDay?: number;
}): LedgerDay[] {
  const byDay = new Map(input.entries.map((e) => [e.dayNumber, e.status]));
  const openUntil = input.chapterEndDay ?? input.currentDay;
  const days: LedgerDay[] = [];
  for (let day = 1; day <= input.lengthDays; day++) {
    let state: LedgerState;
    if (day < input.currentDay) state = byDay.get(day) === "KEPT" ? "kept" : "missed";
    else if (day === input.currentDay) state = byDay.get(day) === "KEPT" ? "kept" : "today";
    else state = day <= openUntil ? "open" : "locked";
    days.push({ dayNumber: day, state });
  }
  return days;
}

export function countHeld(ledger: readonly LedgerDay[]) {
  const reached = ledger.filter((d) => d.state === "kept" || d.state === "missed" || d.state === "today");
  return { held: ledger.filter((d) => d.state === "kept").length, reached: reached.length };
}

/** The calendar date ("YYYY-MM-DD") of an instant in an IANA timezone. */
export function localDate(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return parts;
}

/**
 * A kept day unlocks the next one on the following local calendar day
 * ("Next lesson ready tomorrow").
 */
export function shouldAdvance(input: {
  currentDay: number;
  lengthDays: number;
  keptAt: Date | null;
  now: Date;
  timeZone: string;
}): boolean {
  if (!input.keptAt || input.currentDay >= input.lengthDays) return false;
  return localDate(input.now, input.timeZone) > localDate(input.keptAt, input.timeZone);
}
