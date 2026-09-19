import type { Database } from "@theinnerwar.app/db";

// Read models for Dispatch reports (N1 overview chart, N5 issue report).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

export function csvCell(value: unknown) {
  const s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** N5: delivered → opened → clicked → visited the site → signed up. */
export async function issueReport(db: Database, issueId: string, siteUrl: string) {
  const issue = await db.issue.findUniqueOrThrow({ where: { id: issueId } });
  const [delivered, opened, clicked, signups, deliveries, clicks] = await Promise.all([
    db.delivery.count({ where: { issueId, status: "SENT" } }),
    db.delivery.count({ where: { issueId, openedAt: { not: null } } }),
    db.delivery.count({ where: { issueId, clickedAt: { not: null } } }),
    db.subscriber.count({ where: { convertedIssueId: issueId } }),
    db.delivery.findMany({ where: { issueId, openedAt: { not: null } }, select: { openedAt: true } }),
    db.emailEvent.findMany({ where: { issueId, type: "CLICK" }, select: { url: true, deliveryId: true } }),
  ]);

  const site = hostOf(siteUrl);
  const visited = new Set(
    clicks.filter((c) => c.url && hostOf(c.url) === site).map((c) => c.deliveryId),
  ).size;

  // First opens per hour across the twelve hours after the send started.
  const start = issue.sentAt ?? issue.createdAt;
  const curve = Array.from({ length: 12 }, (_, i) => ({ hour: new Date(start.getTime() + i * HOUR), opens: 0 }));
  for (const d of deliveries) {
    const slot = Math.floor((d.openedAt!.getTime() - start.getTime()) / HOUR);
    if (slot >= 0 && slot < 12) curve[slot]!.opens++;
  }
  const peak = curve.reduce((best, h) => (h.opens > best.opens ? h : best), curve[0]!);

  const byUrl = new Map<string, number>();
  for (const c of clicks) if (c.url) byUrl.set(c.url, (byUrl.get(c.url) ?? 0) + 1);
  const links = [...byUrl.entries()]
    .map(([url, count]) => ({ url, count, toSite: hostOf(url) === site }))
    .sort((a, b) => b.count - a.count);

  const sentTo = issue.recipientCount ?? delivered;
  return {
    issue,
    sentTo,
    funnel: [
      { key: "DELIVERED", value: delivered, rate: ratio(delivered, sentTo) },
      { key: "OPENED", value: opened, rate: ratio(opened, sentTo) },
      { key: "CLICKED", value: clicked, rate: ratio(clicked, sentTo) },
      { key: "VISITED", value: visited, rate: ratio(visited, sentTo) },
      { key: "SIGNED UP", value: signups, rate: ratio(signups, sentTo) },
    ],
    openCurve: curve,
    peak: peak.opens > 0 ? peak.hour : null,
    links,
    totalClicks: clicks.length,
    signups,
  };
}

export async function issueCsv(db: Database, issueId: string) {
  const deliveries = await db.delivery.findMany({
    where: { issueId },
    include: { subscriber: { select: { email: true, convertedIssueId: true, convertedAt: true } } },
    orderBy: { queuedAt: "asc" },
  });
  return toCsv(
    ["email", "status", "sent_at", "opened_at", "clicked_at", "signed_up_from_this_issue", "error"],
    deliveries.map((d) => [
      d.subscriber.email,
      d.status,
      d.sentAt,
      d.openedAt,
      d.clickedAt,
      d.subscriber.convertedIssueId === issueId ? "yes" : "",
      d.error,
    ]),
  );
}

/** N1 chart: new subscribers per month, and the running share who became users. */
export async function growthSeries(db: Database, months = 12, now = new Date()) {
  const first = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const rows = await db.subscriber.findMany({ select: { subscribedAt: true, convertedAt: true } });
  return Array.from({ length: months }, (_, i) => {
    const from = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const to = new Date(first.getFullYear(), first.getMonth() + i + 1, 1);
    const joined = rows.filter((r) => r.subscribedAt >= from && r.subscribedAt < to).length;
    const subscribedBy = rows.filter((r) => r.subscribedAt < to).length;
    const convertedBy = rows.filter((r) => r.convertedAt && r.convertedAt < to).length;
    return { month: from, joined, conversionRate: ratio(convertedBy, subscribedBy) };
  });
}

/** Conversion rate as it stood at a moment, for "Up from 10.6% a month ago". */
export async function conversionRateAt(db: Database, at: Date) {
  const [audience, converted] = await Promise.all([
    db.subscriber.count({
      where: {
        subscribedAt: { lt: at },
        OR: [{ unsubscribedAt: null }, { unsubscribedAt: { gte: at } }, { convertedAt: { lt: at } }],
      },
    }),
    db.subscriber.count({ where: { convertedAt: { lt: at } } }),
  ]);
  return ratio(converted, audience);
}

export const periods = { DAY, HOUR };

export type ConversionRange = "all" | "quarter" | "month";

export function rangeStart(range: ConversionRange, now = new Date()) {
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  return null;
}

/** How many letters converted readers had received first (N7 "How long they read first"). */
export const READ_BUCKETS = [
  { key: "On the welcome email", min: 0, max: 0 },
  { key: "Issues 1 to 3", min: 1, max: 3 },
  { key: "Issues 4 to 6", min: 4, max: 6 },
  { key: "Issues 7 to 12", min: 7, max: 12 },
  { key: "After a dozen or more", min: 13, max: Infinity },
] as const;

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** N7: subscribers who became users, which issue brought them, how long they read. */
export async function conversionReport(db: Database, range: ConversionRange, now = new Date()) {
  const from = rangeStart(range, now);
  const inRange = from ? { gte: from } : { not: null };
  const [audience, convertedTotal, convertedInRange, joinedInRange, converts, issues] = await Promise.all([
    db.subscriber.count({ where: { OR: [{ status: "ACTIVE" }, { convertedAt: { not: null } }] } }),
    db.subscriber.count({ where: { convertedAt: { not: null } } }),
    db.subscriber.count({ where: { convertedAt: inRange } }),
    db.subscriber.count({ where: from ? { subscribedAt: { gte: from } } : {} }),
    db.subscriber.findMany({
      where: { convertedAt: inRange },
      select: { id: true, convertedAt: true, convertedIssueId: true },
    }),
    db.issue.findMany({
      where: { OR: [{ kind: "WELCOME" }, { kind: "BROADCAST", status: "SENT" }] },
      orderBy: { sentAt: "desc" },
      select: { id: true, kind: true, number: true, subject: true, sentAt: true },
    }),
  ]);

  // Broadcasts each converted reader received before converting.
  const received = converts.length
    ? await db.delivery.findMany({
        where: {
          subscriberId: { in: converts.map((c) => c.id) },
          status: "SENT",
          issue: { kind: "BROADCAST" },
        },
        select: { subscriberId: true, sentAt: true },
      })
    : [];
  const readCounts = converts.map(
    (c) => received.filter((r) => r.subscriberId === c.id && r.sentAt && r.sentAt < c.convertedAt!).length,
  );
  const buckets = READ_BUCKETS.map((b) => {
    const count = readCounts.filter((n) => n >= b.min && n <= b.max).length;
    return { key: b.key, count, share: ratio(count, readCounts.length) };
  });

  const byIssue = new Map<string, number>();
  for (const c of converts) {
    if (c.convertedIssueId) byIssue.set(c.convertedIssueId, (byIssue.get(c.convertedIssueId) ?? 0) + 1);
  }
  const attribution = issues
    .map((i) => ({ id: i.id, kind: i.kind, number: i.number, subject: i.subject, signups: byIssue.get(i.id) ?? 0 }))
    .filter((i) => i.kind === "BROADCAST")
    .slice(0, 8);
  const welcome = issues.find((i) => i.kind === "WELCOME");
  const best = [...attribution].sort((a, b) => b.signups - a.signups)[0];
  const second = [...attribution].sort((a, b) => b.signups - a.signups)[1];
  const topBucket = [...buckets].sort((a, b) => b.count - a.count)[0];

  const insights = {
    bestIssue:
      best && best.signups > 0
        ? second && second.signups > 0 && best.signups >= second.signups * 1.5
          ? `Issue ${best.number} brought ${best.signups} signups, half again as many as any other.`
          : `Issue ${best.number} brought the most signups: ${best.signups}.`
        : "No broadcast has brought a signup in this range yet.",
    pattern:
      topBucket && topBucket.count > 0
        ? topBucket.key === "On the welcome email"
          ? "Most people who sign up do it on the welcome email, before any broadcast."
          : `Most people sign up ${topBucket.key.toLowerCase().replace("issues", "after issues")}.`
        : "Not enough signups yet to show a pattern.",
  };

  return {
    range,
    from,
    audience,
    convertedTotal,
    conversionRate: ratio(convertedTotal, audience),
    signups: convertedInRange,
    joined: joinedInRange,
    medianIssuesBeforeSignup: median(readCounts),
    welcomeSignups: welcome ? byIssue.get(welcome.id) ?? 0 : 0,
    best: best && best.signups > 0 ? best : null,
    attribution,
    buckets,
    insights,
  };
}
