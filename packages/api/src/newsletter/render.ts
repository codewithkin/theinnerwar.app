import { Marked, type Tokens } from "marked";

import { effectivePreviewText } from "./analyze";

// Email HTML for "The Inner War" letters, kept deliberately plain so it reads
// (and filters) like a personal letter rather than a marketing email: no page
// background, card, banner, button or web fonts, just text in the reader's own
// system font, with ordinary underlined links. Gmail sends heavily designed
// mail to Promotions; this is the trade-off.
// Styles are inline because most mail clients drop <style> blocks.

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const P = "margin:0 0 16px;";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderInput = {
  /** "THE INNER WAR · ISSUE 19" or "THE INNER WAR · WELCOME". Not shown: a masthead reads as marketing. */
  label: string;
  subject: string;
  previewText?: string | null;
  /** Markdown. A leading `# Heading` is shown as a plain bold title. */
  body: string;
  /** Footer markdown; `{{ unsubscribe_url }}` is replaced with `unsubscribeUrl`. */
  footer: string;
  unsubscribeUrl: string;
  /** Rewrites links for click tracking; identity when absent. */
  trackLink?: (url: string) => string;
  /** Appended as a 1×1 image for open tracking. */
  openPixelUrl?: string;
};

function createMarked(trackLink: (url: string) => string, paragraphStyle = P) {
  return new Marked({
    async: false,
    gfm: true,
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const size = depth === 1 ? 22 : depth === 2 ? 19 : 17;
        return `<h${depth} style="margin:0 0 16px;font-size:${size}px;line-height:1.3;font-weight:bold;">${this.parser.parseInline(tokens)}</h${depth}>`;
      },
      // A link on its own line stays an ordinary link: buttons read as marketing.
      paragraph({ tokens }: Tokens.Paragraph) {
        return `<p style="${paragraphStyle}">${this.parser.parseInline(tokens)}</p>`;
      },
      blockquote({ tokens }: Tokens.Blockquote) {
        const inner = this.parser
          .parse(tokens)
          .replace(/<p style="[^"]*">/g, "")
          .replace(/<\/p>/g, "<br>")
          .replace(/(<br>)+$/, "");
        return `<blockquote style="margin:0 0 16px;padding:0 0 0 14px;border-left:2px solid #cccccc;font-style:italic;">${inner}</blockquote>`;
      },
      hr() {
        return `<hr style="margin:24px 0;border:0;border-top:1px solid #dddddd;">`;
      },
      link({ href, tokens }: Tokens.Link) {
        return `<a href="${escapeHtml(trackLink(href))}">${this.parser.parseInline(tokens)}</a>`;
      },
      list(token: Tokens.List) {
        const tag = token.ordered ? "ol" : "ul";
        const items = token.items
          .map((item) => `<li style="margin:0 0 6px;">${this.parser.parseInline(item.tokens)}</li>`)
          .join("");
        return `<${tag} style="margin:0 0 16px;padding-left:24px;">${items}</${tag}>`;
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
  const footerHtml = createMarked((url) => url, "margin:0 0 8px;font-size:13px;color:#777777;").parse(footerMd) as string;

  // Without preview text, inboxes would show the first line; use the opening paragraph instead.
  const previewText = effectivePreviewText(input.previewText, input.body);
  const preheader = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}${"&#847; &zwnj; &nbsp; ".repeat(30)}</div>`
    : "";
  const pixel = input.openPixelUrl
    ? `<img src="${escapeHtml(input.openPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;">
${preheader}
<div style="max-width:600px;padding:16px;font-family:${FONT};font-size:16px;line-height:1.6;">
${bodyHtml}
<div style="margin-top:28px;padding-top:12px;border-top:1px solid #dddddd;">${footerHtml}</div>
</div>
${pixel}
</body>
</html>`;

  const text = [toPlainText(input.body), "", "—", toPlainText(footerMd)].join("\n");

  return { html, text };
}
