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

/** Inline markdown reduced to the words a reader sees. */
function plainInline(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** The `# Heading` an issue opens with, if any. */
export function titleOf(markdown: string) {
  const m = markdown.match(/^\s*#\s+(.+?)\s*#*\s*$/m);
  return m ? plainInline(m[1]!) : null;
}

/**
 * The line inboxes show after the subject when no preview text is set: the
 * opening paragraph, skipping headings, rules, code and a link standing alone
 * (the button). Cut at a word near `max` characters.
 */
export function derivePreviewText(markdown: string, max = 140) {
  const blocks = markdown.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/);
  for (const block of blocks) {
    const raw = block.trim();
    if (!raw || /^#{1,6}\s/.test(raw) || /^([-*_])(\s*\1){2,}$/.test(raw)) continue;
    if (/^\[[^\]]*\]\([^)]*\)$/.test(raw) || /^!\[/.test(raw)) continue;
    const text = plainInline(
      raw
        .split("\n")
        .map((l) => l.replace(/^\s*(>\s?)+/, "").replace(/^\s*([-*+]|\d+\.)\s+/, ""))
        .join(" "),
    );
    if (!text) continue;
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(" ");
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
  }
  return "";
}

/** Preview text as sent: what was typed, or the opening line when it was left blank. */
export function effectivePreviewText(previewText: string | null | undefined, body: string) {
  return previewText?.trim() || derivePreviewText(body);
}

/** Preview text length hint: inboxes show roughly 40–140 characters. */
export function previewVerdict(previewText: string): "GOOD" | "SHORT" | "LONG" | "EMPTY" {
  const n = previewText.trim().length;
  if (n === 0) return "EMPTY";
  if (n < 40) return "SHORT";
  return n <= 140 ? "GOOD" : "LONG";
}

/** The subject-length hint in the editor: short subjects read in full on phones. */
export function subjectVerdict(subject: string): "GOOD" | "LONG" | "EMPTY" {
  const n = subject.trim().length;
  if (n === 0) return "EMPTY";
  return n <= 50 ? "GOOD" : "LONG";
}
