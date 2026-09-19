import type { Database } from "./index";

/** How far back an open or click can earn credit for a signup (N5). */
export const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Marks the newsletter subscriber with this email as converted to an app user,
 * crediting the last issue they opened or clicked within the attribution window.
 * Called when an account is created; a no-op when the email never subscribed.
 */
export async function linkSubscriberToUser(
  db: Database,
  user: { id: string; email: string },
  now = new Date(),
) {
  const subscriber = await db.subscriber.findUnique({
    where: { email: normalizeEmail(user.email) },
    select: { id: true, userId: true },
  });
  if (!subscriber || subscriber.userId) return null;

  const lastEngaged = await db.emailEvent.findFirst({
    where: {
      subscriberId: subscriber.id,
      type: { in: ["OPEN", "CLICK"] },
      issueId: { not: null },
      createdAt: { gte: new Date(now.getTime() - ATTRIBUTION_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { issueId: true },
  });

  return db.subscriber.update({
    where: { id: subscriber.id },
    data: { userId: user.id, convertedAt: now, convertedIssueId: lastEngaged?.issueId ?? null },
  });
}
