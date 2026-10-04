import { Marked, type Tokens } from "marked";

import { effectivePreviewText } from "./analyze";

// Email HTML for "The Inner War" letters: bare HTML with no styling of our own,
// so it looks like a normal email typed in Gmail and the mail client applies
// its own font, colours and dark mode. No background, colours, fonts, boxes,
// borders or buttons. Headings, bold, italics, quotes, lists and links keep
// their meaning through plain tags. Gmail sends designed mail to Promotions.

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
        return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>`;
      },
      // A link on its own line stays an ordinary link: buttons read as marketing.
      paragraph({ tokens }: Tokens.Paragraph) {
        return `<p>${this.parser.parseInline(tokens)}</p>`;
      },
      blockquote({ tokens }: Tokens.Blockquote) {
        const inner = this.parser
          .parse(tokens)
          .replace(/<p>/g, "")
          .replace(/<\/p>/g, "<br>")
          .replace(/(<br>)+$/, "");
        return `<blockquote><i>${inner}</i></blockquote>`;
      },
      hr() {
        return "<hr>";
      },
      link({ href, tokens }: Tokens.Link) {
        return `<a href="${escapeHtml(trackLink(href))}">${this.parser.parseInline(tokens)}</a>`;
      },
      list(token: Tokens.List) {
        const tag = token.ordered ? "ol" : "ul";
        const items = token.items
          .map((item) => `<li>${this.parser.parseInline(item.tokens)}</li>`)
          .join("");
        return `<${tag}>${items}</${tag}>`;
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
  const footerHtml = createMarked((url) => url).parse(footerMd) as string;

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
<body>
${preheader}
${bodyHtml}
<br>
${footerHtml}
${pixel}
</body>
</html>`;

  const text = [toPlainText(input.body), "", "—", toPlainText(footerMd)].join("\n");

  return { html, text };
}
