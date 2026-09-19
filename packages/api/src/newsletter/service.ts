import type { Database } from "@theinnerwar.app/db";
import { normalizeEmail } from "@theinnerwar.app/db/newsletter";

import { trimSlash, type NewsletterContext } from "./context";
import { renderEmail } from "./render";
import { clickSignature, openSignature, unsubscribeToken } from "./tokens";
import { WELCOME_DEFAULT } from "./welcome";

export type SignupMeta = {
  source?: string;
  pagePath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  timezone?: string;
};

export type SubscribeResult = {
  /** subscribed: new · already: active before · resubscribed: came back after leaving */
  state: "subscribed" | "already" | "resubscribed";
  email: string;
  /** Whether the welcome email actually left (false when SMTP is off or failed). */
  emailSent: boolean;
};

export class UndeliverableError extends Error {}

export async function getSettings(db: Database) {
  return db.newsletterSettings.upsert({ where: { id: "default" }, create: {}, update: {} });
}

export async function ensureWelcomeIssue(db: Database) {
  const existing = await db.issue.findFirst({
    where: { kind: "WELCOME" },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return db.issue.create({ data: { kind: "WELCOME", status: "SENT", ...WELCOME_DEFAULT } });
}

export function issueLabel(issue: { kind: "WELCOME" | "BROADCAST"; number: number | null }) {
  return issue.kind === "WELCOME"
    ? "THE INNER WAR · WELCOME"
    : `THE INNER WAR · ISSUE ${issue.number ?? "DRAFT"}`;
}

export function unsubscribeLinks(nl: NewsletterContext, subscriberId: string) {
  const token = unsubscribeToken(nl.secret, subscriberId);
  return {
    token,
    page: `${trimSlash(nl.webUrl)}/unsubscribe?t=${encodeURIComponent(token)}`,
    oneClick: `${trimSlash(nl.serverUrl)}/n/u?t=${encodeURIComponent(token)}`,
  };
}

function senderFor(
  nl: NewsletterContext,
  settings: { fromName: string; fromAddress: string | null; replyTo: string | null },
) {
  return {
    from: settings.fromAddress ? `"${settings.fromName}" <${settings.fromAddress}>` : undefined,
    replyTo: settings.replyTo ?? nl.mailer.defaultReplyTo,
  };
}

/**
 * Renders and sends an existing delivery (one issue to one subscriber) with
 * open and click tracking. Returns whether the mail left; failures are
 * recorded on the delivery, not thrown.
 */
export async function sendDelivery(db: Database, nl: NewsletterContext, deliveryId: string): Promise<boolean> {
  const delivery = await db.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    include: { issue: true, subscriber: { select: { id: true, email: true } } },
  });
  const { issue, subscriber } = delivery;

  if (!nl.mailer.enabled) {
    await db.delivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: "SMTP not configured" },
    });
    return false;
  }

  const settings = await getSettings(db);
  const server = trimSlash(nl.serverUrl);
  const links = unsubscribeLinks(nl, subscriber.id);
  const { html, text } = renderEmail({
    label: issueLabel(issue),
    subject: issue.subject,
    previewText: issue.previewText,
    body: issue.body,
    footer: settings.footer,
    unsubscribeUrl: links.page,
    trackLink: (url) =>
      /^https?:\/\//i.test(url)
        ? `${server}/n/c/${delivery.id}?u=${encodeURIComponent(url)}&s=${clickSignature(nl.secret, delivery.id, url)}`
        : url,
    openPixelUrl: `${server}/n/o/${delivery.id}?s=${openSignature(nl.secret, delivery.id)}`,
  });

  try {
    const { messageId } = await nl.mailer.send({
      to: subscriber.email,
      subject: issue.subject,
      html,
      text,
      ...senderFor(nl, settings),
      headers: {
        "List-Unsubscribe": `<${links.oneClick}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await db.delivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", sentAt: new Date(), messageId, error: null },
    });
    return true;
  } catch (error) {
    console.error("[newsletter] send failed", error);
    await db.delivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error" },
    });
    return false;
  }
}

/** Sends one issue to one subscriber right now (the welcome email). */
export async function deliverIssue(
  db: Database,
  nl: NewsletterContext,
  issueId: string,
  subscriber: { id: string; email: string },
): Promise<boolean> {
  const delivery = await db.delivery.upsert({
    where: { issueId_subscriberId: { issueId, subscriberId: subscriber.id } },
    create: { issueId, subscriberId: subscriber.id, status: "SENDING", claimedAt: new Date() },
    update: { status: "SENDING", claimedAt: new Date(), error: null },
  });
  return sendDelivery(db, nl, delivery.id);
}

/** Sends an issue to an arbitrary address as a test: no delivery row, no tracking. */
export async function sendTestIssue(db: Database, nl: NewsletterContext, issueId: string, to: string) {
  const [issue, settings] = await Promise.all([
    db.issue.findUniqueOrThrow({ where: { id: issueId } }),
    getSettings(db),
  ]);
  const { html, text } = renderEmail({
    label: `${issueLabel(issue)} · TEST`,
    subject: issue.subject,
    previewText: issue.previewText,
    body: issue.body,
    footer: settings.footer,
    unsubscribeUrl: `${trimSlash(nl.webUrl)}/unsubscribe`,
  });
  return nl.mailer.send({ to, subject: `[Test] ${issue.subject}`, html, text, ...senderFor(nl, settings) });
}

export async function subscribe(
  db: Database,
  nl: NewsletterContext,
  rawEmail: string,
  meta: SignupMeta,
): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);

  const suppressed = await db.suppression.findUnique({ where: { email } });
  if (suppressed && suppressed.reason !== "MANUAL") {
    throw new UndeliverableError("We can't deliver mail to this address. Try another one.");
  }

  const existing = await db.subscriber.findUnique({ where: { email } });
  if (existing?.status === "ACTIVE") return { state: "already", email, emailSent: false };

  // Someone who already has an app account joins the list: link, but it is not a conversion.
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });

  const subscriber = existing
    ? await db.subscriber.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          resubscribedAt: new Date(),
          unsubscribedAt: null,
          unsubscribeReason: null,
        },
      })
    : await db.subscriber.create({ data: { email, ...meta, userId: user?.id } });

  if (suppressed) await db.suppression.delete({ where: { email } });

  const welcome = await ensureWelcomeIssue(db);
  const emailSent = await deliverIssue(db, nl, welcome.id, subscriber);
  return { state: existing ? "resubscribed" : "subscribed", email, emailSent };
}

export async function unsubscribe(db: Database, subscriberId: string, reason?: string) {
  const subscriber = await db.subscriber.findUnique({ where: { id: subscriberId } });
  if (!subscriber) return null;
  if (subscriber.status === "ACTIVE") {
    await db.subscriber.update({
      where: { id: subscriber.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), unsubscribeReason: reason ?? null },
    });
    await db.emailEvent.create({ data: { type: "UNSUBSCRIBE", subscriberId: subscriber.id } });
  }
  return subscriber;
}

export async function recordOpen(db: Database, deliveryId: string, userAgent?: string) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return;
  const now = new Date();
  await db.$transaction([
    db.emailEvent.create({
      data: {
        type: "OPEN",
        subscriberId: delivery.subscriberId,
        issueId: delivery.issueId,
        deliveryId,
        userAgent: userAgent?.slice(0, 300),
      },
    }),
    db.delivery.update({ where: { id: deliveryId }, data: { openedAt: delivery.openedAt ?? now } }),
    db.subscriber.update({ where: { id: delivery.subscriberId }, data: { lastOpenedAt: now } }),
  ]);
}

export async function recordClick(db: Database, deliveryId: string, url: string, userAgent?: string) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return;
  const now = new Date();
  await db.$transaction([
    db.emailEvent.create({
      data: {
        type: "CLICK",
        subscriberId: delivery.subscriberId,
        issueId: delivery.issueId,
        deliveryId,
        url: url.slice(0, 2000),
        userAgent: userAgent?.slice(0, 300),
      },
    }),
    // A click implies the email was opened, even when images were blocked.
    db.delivery.update({
      where: { id: deliveryId },
      data: { clickedAt: delivery.clickedAt ?? now, openedAt: delivery.openedAt ?? now },
    }),
    db.subscriber.update({
      where: { id: delivery.subscriberId },
      data: { lastClickedAt: now, lastOpenedAt: now },
    }),
  ]);
}

export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  const shown = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(1, Math.min(6, name.length - shown.length)))}@${domain}`;
}
