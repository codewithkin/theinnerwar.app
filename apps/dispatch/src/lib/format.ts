// Number and date formatting in the design's voice: "12.4%", "4,120", "14 Sep".

export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");

export function pct(ratio: number | null | undefined, digits = 1) {
  return `${((ratio ?? 0) * 100).toFixed(digits)}%`;
}

/** Signed change for delta chips: "↗ 1.8", "↘ 0.1". */
export function delta(current: number, previous: number, asPoints = false) {
  const d = asPoints ? (current - previous) * 100 : previous ? ((current - previous) / previous) * 100 : 0;
  if (!Number.isFinite(d) || Math.abs(d) < 0.05) return { text: "→ 0", up: null as boolean | null };
  return { text: `${d > 0 ? "↗" : "↘"} ${Math.abs(d).toFixed(1)}${asPoints ? "" : "%"}`, up: d > 0 };
}

export function day(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function dateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function time(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export function ago(date: Date | string | null | undefined) {
  if (!date) return "never";
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return `${Math.round(s / (86400 * 30))}mo ago`;
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** Next occurrence of a weekday + "HH:MM" in the browser's time zone (the usual slot). */
export function nextSlot(weekday: number, hhmm: string, from = new Date()) {
  const [h = 9, m = 0] = hhmm.split(":").map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  let add = (weekday - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() <= from.getTime() + 60_000) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
