import { Resolver } from "node:dns/promises";

import type { Database } from "@theinnerwar.app/db";

import { createLogger } from "./log";
import { ratio } from "./reports";

const log = createLogger("newsletter.dns");

// The system resolver can refuse queries (e.g. a local stub on 127.0.0.1 that only
// answers A records), so lookups fall back to public resolvers.
const systemResolver = new Resolver({ timeout: 3000, tries: 1 });
const publicResolver = new Resolver({ timeout: 3000, tries: 2 });
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const NO_RECORD = new Set(["ENODATA", "ENOTFOUND"]);

async function lookup<T>(what: string, name: string, fn: (r: Resolver) => Promise<T>, empty: T): Promise<T> {
  for (const [label, resolver] of [["system", systemResolver], ["public", publicResolver]] as const) {
    try {
      const result = await fn(resolver);
      log.debug("lookup ok", { what, name, resolver: label });
      return result;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code && NO_RECORD.has(code)) {
        log.debug("lookup empty", { what, name, resolver: label, code });
        return empty;
      }
      log.warn("lookup failed", { what, name, resolver: label, error });
    }
  }
  throw new Error(`Could not look up ${what} for ${name}`);
}

// Dispatch N8: is mail arriving? Everything here is measured: SMTP outcomes,
// recorded bounces and complaints, and live DNS lookups for the sending domain.
// Inbox-vs-spam placement is not measurable without a seed-list service.

export type CheckStatus = "PASSING" | "MISSING" | "WARNING" | "UNKNOWN";
export type DomainCheck = { key: string; value: string; status: CheckStatus; note?: string };

export function domainOf(address?: string | null) {
  const match = address?.match(/@([^>\s]+)>?\s*$/);
  return match?.[1]?.toLowerCase() ?? null;
}

async function txt(name: string) {
  const records = await lookup("TXT", name, (r) => r.resolveTxt(name), [] as string[][]);
  return records.map((parts) => parts.join(""));
}

/** SPF, DKIM, DMARC and MX for the domain mail is sent from. */
export async function checkDomain(domain: string, dkimSelector?: string | null): Promise<DomainCheck[]> {
  const run = async (key: string, fn: () => Promise<DomainCheck>): Promise<DomainCheck> => {
    try {
      return await fn();
    } catch (error) {
      return { key, value: error instanceof Error ? error.message : "Lookup failed", status: "UNKNOWN" };
    }
  };

  log.info("checking domain", { domain, dkimSelector });
  const checks = await Promise.all([
    run("SPF", async () => {
      const spf = (await txt(domain)).find((r) => r.toLowerCase().startsWith("v=spf1"));
      return spf
        ? { key: "SPF", value: spf, status: "PASSING" }
        : { key: "SPF", value: `No SPF record on ${domain}`, status: "MISSING" };
    }),
    run("DKIM", async () => {
      if (!dkimSelector) {
        return {
          key: "DKIM",
          value: "Set the DKIM selector in Settings to check it",
          status: "WARNING",
        };
      }
      const name = `${dkimSelector}._domainkey.${domain}`;
      const key = (await txt(name)).find((r) => /v=DKIM1|k=rsa|p=/i.test(r));
      return key
        ? { key: "DKIM", value: name, status: "PASSING" }
        : { key: "DKIM", value: `Nothing published at ${name}`, status: "MISSING" };
    }),
    run("DMARC", async () => {
      const dmarc = (await txt(`_dmarc.${domain}`)).find((r) => r.toLowerCase().startsWith("v=dmarc1"));
      if (!dmarc) return { key: "DMARC", value: `No DMARC record on _dmarc.${domain}`, status: "MISSING" };
      const policy = dmarc.match(/p=(\w+)/i)?.[1]?.toLowerCase();
      return {
        key: "DMARC",
        value: dmarc,
        status: policy === "none" ? "WARNING" : "PASSING",
        note: policy === "none" ? "Policy is p=none: monitored, not enforced" : undefined,
      };
    }),
    run("MX", async () => {
      const mx = await lookup("MX", domain, (r) => r.resolveMx(domain), [] as { exchange: string; priority: number }[]);
      return mx.length
        ? {
            key: "MX",
            value: mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange).slice(0, 3).join(", "),
            status: "PASSING",
          }
        : { key: "MX", value: `No MX records: replies to ${domain} can't be received`, status: "MISSING" };
    }),
  ]);
  log.info("domain checked", { domain, results: checks.map((c) => `${c.key}:${c.status}`) });
  return checks;
}

/** Delivery health for the last broadcast (or the welcome email when nothing has gone yet). */
export async function deliveryHealth(db: Database) {
  const last = await db.issue.findFirst({
    where: { kind: "BROADCAST", status: { in: ["SENT", "SENDING"] } },
    orderBy: { sentAt: "desc" },
  });
  const scope = last
    ? { issueId: last.id }
    : { issue: { kind: "WELCOME" as const }, queuedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } };

  const [grouped, opened, complaints, suppressed] = await Promise.all([
    db.delivery.groupBy({ by: ["status"], where: scope, _count: true }),
    db.delivery.count({ where: { ...scope, openedAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "COMPLAINT", ...(last ? { issueId: last.id } : {}) } }),
    db.suppression.groupBy({ by: ["reason"], _count: true }),
  ]);
  const count = (s: string) => grouped.find((g) => g.status === s)?._count ?? 0;
  const sent = count("SENT");
  const failed = count("FAILED");
  const bounced = count("BOUNCED");
  const attempted = sent + failed + bounced;

  return {
    scope: last
      ? { kind: "BROADCAST" as const, id: last.id, number: last.number, subject: last.subject, sentAt: last.sentAt }
      : { kind: "WELCOME" as const },
    attempted,
    stats: {
      deliveredRate: ratio(sent, attempted),
      delivered: sent,
      bounceRate: ratio(bounced, attempted),
      bounced,
      complaintRate: ratio(complaints, sent),
      complaints,
      failed,
    },
    outcome: [
      { key: "Delivered and opened", value: opened },
      { key: "Delivered, not opened yet", value: Math.max(0, sent - opened) },
      { key: "Failed to send", value: failed },
      { key: "Bounced", value: bounced },
    ].map((o) => ({ ...o, share: ratio(o.value, attempted) })),
    suppressed: {
      HARD_BOUNCE: suppressed.find((s) => s.reason === "HARD_BOUNCE")?._count ?? 0,
      COMPLAINT: suppressed.find((s) => s.reason === "COMPLAINT")?._count ?? 0,
      MANUAL: suppressed.find((s) => s.reason === "MANUAL")?._count ?? 0,
    },
  };
}

/**
 * A permanent (5xx) rejection of the recipient at RCPT TO: the address should
 * never be tried again. Other 5xx errors (e.g. 535 bad SMTP login) are ours,
 * not the reader's, and must not suppress anyone.
 */
export function isHardBounce(error: unknown) {
  const e = error as { responseCode?: number; command?: string; code?: string } | null;
  const code = e?.responseCode;
  const permanent = typeof code === "number" && code >= 500 && code < 600;
  return permanent && (e?.command === "RCPT TO" || e?.code === "EENVELOPE");
}
