import type { Database } from "@theinnerwar.app/db";

import type { NewsletterContext } from "./context";
import { createLogger } from "./log";
import { sendDelivery } from "./service";

const log = createLogger("newsletter.broadcast");

// Broadcasts (Dispatch N4): an issue is scheduled or sent now, which queues one
// delivery per active, non-suppressed subscriber; a runner then sends the queue
// in small batches so a slow SMTP server (or Gmail's daily cap) is respected.

/** A scheduled send can be stopped until one minute before it goes (N4). */
export const CANCEL_CUTOFF_MS = 60 * 1000;
/** Claims older than this are assumed abandoned by a crashed runner. */
const STALE_CLAIM_MS = 10 * 60 * 1000;

export class BroadcastError extends Error {}

async function nextNumber(db: Database) {
  const last = await db.issue.aggregate({ _max: { number: true } });
  return (last._max.number ?? 0) + 1;
}

async function requireBroadcast(db: Database, id: string) {
  const issue = await db.issue.findUnique({ where: { id } });
  if (!issue || issue.kind !== "BROADCAST") throw new BroadcastError("Issue not found");
  return issue;
}

/** Everyone who should receive the next broadcast. */
export function audienceWhere() {
  return { status: "ACTIVE" as const };
}

export async function audienceCount(db: Database) {
  const [active, suppressed] = await Promise.all([
    db.subscriber.findMany({ where: audienceWhere(), select: { email: true } }),
    db.suppression.findMany({ select: { email: true } }),
  ]);
  const blocked = new Set(suppressed.map((s) => s.email));
  return active.filter((s) => !blocked.has(s.email)).length;
}

export async function scheduleIssue(db: Database, id: string, at: Date, now = new Date()) {
  const issue = await requireBroadcast(db, id);
  if (issue.status !== "DRAFT" && issue.status !== "SCHEDULED") {
    throw new BroadcastError("Only drafts can be scheduled");
  }
  if (at.getTime() < now.getTime() + CANCEL_CUTOFF_MS) {
    throw new BroadcastError("Pick a time at least a minute from now, or send immediately");
  }
  const updated = await db.issue.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledFor: at, number: issue.number ?? (await nextNumber(db)) },
  });
  log.info("scheduled", { issueId: id, number: updated.number, at });
  return updated;
}

export async function cancelSchedule(db: Database, id: string, now = new Date()) {
  const issue = await requireBroadcast(db, id);
  if (issue.status !== "SCHEDULED" || !issue.scheduledFor) throw new BroadcastError("Not scheduled");
  if (issue.scheduledFor.getTime() - now.getTime() < CANCEL_CUTOFF_MS) {
    throw new BroadcastError("Too late to stop: it goes in under a minute");
  }
  log.info("schedule cancelled", { issueId: id, wasFor: issue.scheduledFor });
  return db.issue.update({ where: { id }, data: { status: "DRAFT", scheduledFor: null } });
}

/** Queues the issue for everyone in the audience and marks it SENDING. */
export async function startSend(db: Database, id: string, now = new Date()) {
  const issue = await requireBroadcast(db, id);
  if (issue.status !== "DRAFT" && issue.status !== "SCHEDULED") {
    throw new BroadcastError("This issue has already gone");
  }
  // Claim the issue first so two runners can't both queue it.
  const claimed = await db.issue.updateMany({
    where: { id, status: issue.status },
    data: { status: "SENDING", sentAt: now, number: issue.number ?? (await nextNumber(db)) },
  });
  if (claimed.count === 0) {
    log.warn("send start lost race: already claimed", { issueId: id });
    return db.issue.findUniqueOrThrow({ where: { id } });
  }

  const [subscribers, suppressed] = await Promise.all([
    db.subscriber.findMany({ where: audienceWhere(), select: { id: true, email: true } }),
    db.suppression.findMany({ select: { email: true } }),
  ]);
  const blocked = new Set(suppressed.map((s) => s.email));
  const recipients = subscribers.filter((s) => !blocked.has(s.email));

  for (let i = 0; i < recipients.length; i += 1000) {
    await db.delivery.createMany({
      data: recipients.slice(i, i + 1000).map((s) => ({ issueId: id, subscriberId: s.id })),
      skipDuplicates: true,
    });
  }
  log.info("send started", {
    issueId: id,
    recipients: recipients.length,
    skippedSuppressed: subscribers.length - recipients.length,
  });
  return db.issue.update({ where: { id }, data: { recipientCount: recipients.length } });
}

/**
 * One tick of the runner: starts scheduled issues that are due, sends up to
 * `batch` queued deliveries, and closes issues whose queue is empty.
 */
export async function processQueue(
  db: Database,
  nl: NewsletterContext,
  { batch = 20, now = new Date() }: { batch?: number; now?: Date } = {},
) {
  const due = await db.issue.findMany({
    where: { kind: "BROADCAST", status: "SCHEDULED", scheduledFor: { lte: now } },
    select: { id: true },
  });
  for (const issue of due) await startSend(db, issue.id, now);

  if (due.length) log.info("due scheduled issues started", { count: due.length });

  // Return abandoned claims to the queue.
  const reclaimed = await db.delivery.updateMany({
    where: { status: "SENDING", claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
    data: { status: "QUEUED", claimedAt: null },
  });
  if (reclaimed.count) log.warn("reclaimed stale deliveries", { count: reclaimed.count });

  let sent = 0;
  let failed = 0;
  if (!nl.mailer.enabled) log.debug("queue tick skipped sending: SMTP not configured");
  if (nl.mailer.enabled) {
    const queued = await db.delivery.findMany({
      where: { status: "QUEUED", issue: { status: "SENDING" } },
      orderBy: { queuedAt: "asc" },
      take: batch,
      select: { id: true },
    });
    for (const { id } of queued) {
      const claim = await db.delivery.updateMany({
        where: { id, status: "QUEUED" },
        data: { status: "SENDING", claimedAt: new Date() },
      });
      if (claim.count === 0) continue; // another runner took it
      if (await sendDelivery(db, nl, id)) sent++;
      else failed++;
    }
  }

  const sending = await db.issue.findMany({ where: { status: "SENDING" }, select: { id: true } });
  let finished = 0;
  for (const issue of sending) {
    const left = await db.delivery.count({
      where: { issueId: issue.id, status: { in: ["QUEUED", "SENDING"] } },
    });
    if (left === 0) {
      await db.issue.update({ where: { id: issue.id }, data: { status: "SENT" } });
      log.info("send finished", { issueId: issue.id });
      finished++;
    }
  }
  const result = { started: due.length, sent, failed, finished };
  if (sent || failed || finished || due.length) log.info("queue tick", result);
  else log.debug("queue tick idle");
  return result;
}
