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
