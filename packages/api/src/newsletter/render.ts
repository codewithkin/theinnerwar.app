import { Marked, type Tokens } from "marked";

// Email HTML for "The Inner War" letters, after the live preview in Dispatch
// (designs/Newsletter N3): a 600px bone-paper column, Newsreader body, an ember
// rule on quotes, and a solid ember button for a link that stands alone.
// Styles are inline because most mail clients drop <style> blocks.

const C = {
  paper: "#f7f3ec",
  page: "#e9e3d8",
  ink: "#1b1a16",
  body: "#37332c",
  rule: "#ddd6c8",
  meta: "#8a7f6d",
  ember: "#e2701f",
  buttonInk: "#fff6ea",
};
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif";
const SANS = "Archivo, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', Menlo, Consolas, monospace";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderInput = {
  /** "THE INNER WAR · ISSUE 19" or "THE INNER WAR · WELCOME". */
  label: string;
  subject: string;
  previewText?: string | null;
  /** Markdown. A leading `# Heading` becomes the title. */
  body: string;
  /** Footer markdown; `{{ unsubscribe_url }}` is replaced with `unsubscribeUrl`. */
  footer: string;
  unsubscribeUrl: string;
  /** Rewrites links for click tracking; identity when absent. */
  trackLink?: (url: string) => string;
  /** Appended as a 1×1 image for open tracking. */
  openPixelUrl?: string;
};

function createMarked(trackLink: (url: string) => string) {
  return new Marked({
    async: false,
    gfm: true,
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const size = depth === 1 ? 38 : depth === 2 ? 26 : 21;
        return `<h${depth} style="margin:0 0 20px;font-family:${SERIF};font-weight:400;font-size:${size}px;line-height:1.1;letter-spacing:-0.02em;color:${C.ink};">${text}</h${depth}>`;
      },
      paragraph({ tokens }: Tokens.Paragraph) {
        const only = tokens.length === 1 ? tokens[0] : undefined;
        if (only?.type === "link") {
          const link = only as Tokens.Link;
          return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="background:${C.ember};"><a href="${escapeHtml(trackLink(link.href))}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:15px;font-weight:600;color:${C.buttonInk};text-decoration:none;">${this.parser.parseInline(link.tokens)}</a></td></tr></table>`;
        }
        return `<p style="margin:0 0 20px;font-family:${SERIF};font-size:17px;line-height:1.68;color:${C.body};">${this.parser.parseInline(tokens)}</p>`;
      },
      blockquote({ tokens }: Tokens.Blockquote) {
        const inner = this.parser
          .parse(tokens)
          .replace(/<p style="[^"]*">/g, "")
          .replace(/<\/p>/g, "<br>")
          .replace(/(<br>)+$/, "");
        return `<div style="margin:4px 0 24px;padding:4px 0 4px 20px;border-left:2px solid ${C.ember};font-family:${SERIF};font-style:italic;font-size:20px;line-height:1.48;color:${C.ink};">${inner}</div>`;
      },
      hr() {
        return `<div style="height:1px;background:${C.rule};margin:6px 0 26px;line-height:1px;font-size:1px;">&nbsp;</div>`;
      },
      strong({ tokens }: Tokens.Strong) {
        return `<strong style="font-weight:600;color:${C.ink};">${this.parser.parseInline(tokens)}</strong>`;
      },
      link({ href, tokens }: Tokens.Link) {
        return `<a href="${escapeHtml(trackLink(href))}" style="color:${C.ink};text-decoration:underline;">${this.parser.parseInline(tokens)}</a>`;
      },
      list(token: Tokens.List) {
        const tag = token.ordered ? "ol" : "ul";
        const items = token.items
          .map(
            (item) =>
              `<li style="margin:0 0 8px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${C.body};">${this.parser.parseInline(item.tokens)}</li>`,
          )
          .join("");
        return `<${tag} style="margin:0 0 20px;padding-left:22px;">${items}</${tag}>`;
      },
      // Raw HTML in the markdown is shown as text, never injected.
      html({ text }) {
        return escapeHtml(text);
      },
    },
  });
}

/** Plain-text alternative: markdown minus its markup, links as "text (url)". */
export function toPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmail(input: RenderInput) {
  const trackLink = input.trackLink ?? ((url: string) => url);
  const footerMd = input.footer.replace(/\{\{\s*unsubscribe_url\s*\}\}/g, input.unsubscribeUrl);

  // The unsubscribe link is never click-tracked.
  const bodyHtml = createMarked(trackLink).parse(input.body) as string;
  const footerHtml = (createMarked((url) => url).parse(footerMd) as string).replace(
    /font-family:[^;]+;font-size:17px;line-height:1.68;color:#37332c;/g,
    `font-family:${SANS};font-size:12px;line-height:1.6;color:${C.meta};`,
  );

  const preheader = input.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.previewText)}${"&#847; &zwnj; &nbsp; ".repeat(30)}</div>`
    : "";
  const pixel = input.openPixelUrl
    ? `<img src="${escapeHtml(input.openPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};">
<tr><td style="padding:44px 48px 36px;">
<div style="padding-bottom:18px;margin-bottom:24px;border-bottom:1px solid ${C.rule};font-family:${MONO};font-size:10px;letter-spacing:0.2em;color:${C.meta};"><span style="color:${C.ember};">&#9679;</span>&nbsp;&nbsp;${escapeHtml(input.label)}</div>
${bodyHtml}
<div style="margin-top:10px;padding-top:16px;border-top:1px solid ${C.rule};">${footerHtml}</div>
</td></tr>
</table>
${pixel}
</td></tr>
</table>
</body>
</html>`;

  const text = [
    input.label,
    "",
    toPlainText(input.body),
    "",
    "—",
    toPlainText(footerMd),
  ].join("\n");

  return { html, text };
}
