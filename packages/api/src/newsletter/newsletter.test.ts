import { describe, expect, test } from "bun:test";

import { analyzeBody, subjectVerdict } from "./analyze";
import { createRateLimiter } from "./rate-limit";
import { median, rangeStart, toCsv } from "./reports";
import { renderEmail, toPlainText } from "./render";
import {
  adminToken,
  clickSignature,
  readUnsubscribeToken,
  unsubscribeToken,
  verifyAdminToken,
  verifyClick,
} from "./tokens";
import { WELCOME_DEFAULT } from "./welcome";

const secret = "test-secret-that-is-long-enough-to-be-real";

describe("tokens", () => {
  test("unsubscribe round-trips and rejects tampering", () => {
    const token = unsubscribeToken(secret, "sub_123");
    expect(readUnsubscribeToken(secret, token)).toBe("sub_123");
    expect(readUnsubscribeToken(secret, token.replace("sub_123", "sub_999"))).toBeNull();
    expect(readUnsubscribeToken("other-secret", token)).toBeNull();
    expect(readUnsubscribeToken(secret, "garbage")).toBeNull();
  });

  test("click signatures bind the destination", () => {
    const sig = clickSignature(secret, "d1", "https://innerwar.app");
    expect(verifyClick(secret, "d1", "https://innerwar.app", sig)).toBe(true);
    expect(verifyClick(secret, "d1", "https://evil.example", sig)).toBe(false);
    expect(verifyClick(secret, "d2", "https://innerwar.app", sig)).toBe(false);
  });

  test("admin sessions expire and are bound to the email", () => {
    const now = 1_000_000;
    const token = adminToken(secret, "a@b.co", 1000, now);
    expect(verifyAdminToken(secret, "a@b.co", token, now + 500)).toBe(true);
    expect(verifyAdminToken(secret, "a@b.co", token, now + 1500)).toBe(false);
    expect(verifyAdminToken(secret, "x@b.co", token, now + 500)).toBe(false);
  });
});

describe("renderEmail", () => {
  const base = {
    label: "THE INNER WAR · ISSUE 19",
    subject: "The hour you avoid",
    previewText: "Not a difficult hour. An ordinary one.",
    body: "# The hour you avoid\n\nEvery writer has one.\n\n> Keep the hour.\n\n[Start your first campaign](https://innerwar.app)\n\n<script>alert(1)</script>",
    footer: "You asked for it. [Unsubscribe]({{ unsubscribe_url }}) and it stops.",
    unsubscribeUrl: "https://innerwar.app/unsubscribe?t=abc",
  };

  test("tracks body links but never the unsubscribe link", () => {
    const { html } = renderEmail({ ...base, trackLink: (u) => `https://t.example/c?u=${encodeURIComponent(u)}` });
    expect(html).toContain("https://t.example/c?u=https%3A%2F%2Finnerwar.app");
    expect(html).toContain('href="https://innerwar.app/unsubscribe?t=abc"');
  });

  test("a lone link becomes the ember button; raw HTML is escaped", () => {
    const { html } = renderEmail(base);
    expect(html).toContain("background:#e2701f");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Not a difficult hour.");
  });

  test("plain text keeps link targets", () => {
    const { text } = renderEmail(base);
    expect(text).toContain("Start your first campaign (https://innerwar.app)");
    expect(text).toContain("Unsubscribe (https://innerwar.app/unsubscribe?t=abc)");
    expect(toPlainText("**bold** and *soft*")).toBe("bold and soft");
  });

  test("the welcome draft renders", () => {
    const { html } = renderEmail({ ...base, ...WELCOME_DEFAULT, label: "THE INNER WAR · WELCOME" });
    expect(html).toContain("Why you signed up");
  });
});

test("rate limiter allows the limit then blocks until the window resets", () => {
  const allow = createRateLimiter(2, 1000);
  expect(allow("k", 0)).toBe(true);
  expect(allow("k", 1)).toBe(true);
  expect(allow("k", 2)).toBe(false);
  expect(allow("other", 2)).toBe(true);
  expect(allow("k", 1001)).toBe(true);
});

describe("analyzeBody", () => {
  test("counts words and links, and finds the pitch", () => {
    const a = analyzeBody(
      "# Title\n\nOne two three.\n\n[Start your first campaign](https://innerwar.app/)\n\nSee https://example.com/x",
      "https://innerwar.app",
    );
    expect(a.links).toEqual(["https://innerwar.app/", "https://example.com/x"]);
    expect(a.pitchPresent).toBe(true);
    expect(a.words).toBeGreaterThan(5);
  });

  test("no link home means no pitch", () => {
    expect(analyzeBody("Just words.", "https://innerwar.app").pitchPresent).toBe(false);
    expect(subjectVerdict("The hour you avoid")).toBe("GOOD");
    expect(subjectVerdict("x".repeat(60))).toBe("LONG");
  });
});

describe("reports helpers", () => {
  test("median and ranges", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    const now = new Date(2026, 8, 19);
    expect(rangeStart("month", now)).toEqual(new Date(2026, 8, 1));
    expect(rangeStart("quarter", now)).toEqual(new Date(2026, 6, 1));
    expect(rangeStart("all", now)).toBeNull();
  });

  test("csv escaping", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""\r\n');
  });
});
