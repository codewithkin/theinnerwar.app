// Pure checks on an issue's markdown, shared by the Dispatch editor footer (N3)
// and the preflight list (N4). No server dependencies: safe to import in a browser.

export type BodyAnalysis = {
  words: number;
  readMinutes: number;
  links: string[];
  /** A link back to the site: the pitch the design asks every issue to end with. */
  pitchPresent: boolean;
};

const LINK = /\[[^\]]*\]\(([^)\s]+)\)|<(https?:\/\/[^>\s]+)>|(?<![(<])\b(https?:\/\/[^\s)<>]+)/g;

export function analyzeBody(markdown: string, siteUrl?: string): BodyAnalysis {
  const text = markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const links = [...markdown.matchAll(LINK)].map((m) => m[1] ?? m[2] ?? m[3] ?? "").filter(Boolean);
  let host: string | null = null;
  try {
    host = siteUrl ? new URL(siteUrl).host : null;
  } catch {}
  const pitchPresent = links.some((l) => {
    try {
      return host ? new URL(l).host === host : false;
    } catch {
      return false;
    }
  });
  return { words, readMinutes: Math.max(1, Math.round(words / 230)), links, pitchPresent };
}

/** The subject-length hint in the editor: short subjects read in full on phones. */
export function subjectVerdict(subject: string): "GOOD" | "LONG" | "EMPTY" {
  const n = subject.trim().length;
  if (n === 0) return "EMPTY";
  return n <= 50 ? "GOOD" : "LONG";
}
