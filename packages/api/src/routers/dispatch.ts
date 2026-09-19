import type { Database, Prisma } from "@theinnerwar.app/db";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { publicProcedure, router, t } from "../index";
import { analyzeBody } from "../newsletter/analyze";
import {
  BroadcastError,
  audienceCount,
  cancelSchedule,
  scheduleIssue,
  startSend,
} from "../newsletter/broadcast";
import { createRateLimiter } from "../newsletter/rate-limit";
import { renderEmail } from "../newsletter/render";
import {
  conversionRateAt,
  conversionReport,
  growthSeries,
  issueCsv,
  issueReport,
} from "../newsletter/reports";
import { ensureWelcomeIssue, getSettings, issueLabel, sendTestIssue } from "../newsletter/service";
import { adminToken, safeEqual, verifyAdminToken } from "../newsletter/tokens";

// Dispatch: the internal newsletter tool (designs/Newsletter N1–N9).
// One admin, identified by DISPATCH_ADMIN_EMAIL / DISPATCH_ADMIN_PASSWORD.

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const loginLimit = createRateLimiter(10, 15 * 60 * 1000);

async function broadcastAction<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof BroadcastError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

const adminProcedure = t.procedure.use(({ ctx, next }) => {
  const email = ctx.newsletter.admin.email;
  const token = ctx.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!email || !token || !verifyAdminToken(ctx.newsletter.secret, email, token)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to Dispatch" });
  }
  return next({ ctx: { ...ctx, adminEmail: email } });
});

const pct = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Sent / opened / clicked / signups per issue, for the lists and reports. */
async function issueStats(db: Database, issueIds: string[]) {
  const [sent, opened, clicked, signups] = await Promise.all([
    db.delivery.groupBy({ by: ["issueId"], where: { issueId: { in: issueIds }, status: "SENT" }, _count: true }),
    db.delivery.groupBy({ by: ["issueId"], where: { issueId: { in: issueIds }, openedAt: { not: null } }, _count: true }),
    db.delivery.groupBy({ by: ["issueId"], where: { issueId: { in: issueIds }, clickedAt: { not: null } }, _count: true }),
    db.subscriber.groupBy({ by: ["convertedIssueId"], where: { convertedIssueId: { in: issueIds } }, _count: true }),
  ]);
  const tally = (rows: { key: string | null; _count: number }[]) =>
    new Map(rows.map((r) => [r.key, r._count]));
  const sentBy = tally(sent.map((r) => ({ key: r.issueId, _count: r._count })));
  const openedBy = tally(opened.map((r) => ({ key: r.issueId, _count: r._count })));
  const clickedBy = tally(clicked.map((r) => ({ key: r.issueId, _count: r._count })));
  const signupsBy = tally(signups.map((r) => ({ key: r.convertedIssueId, _count: r._count })));
  return new Map(
    issueIds.map((id) => [
      id,
      {
        sent: sentBy.get(id) ?? 0,
        opened: openedBy.get(id) ?? 0,
        clicked: clickedBy.get(id) ?? 0,
        signups: signupsBy.get(id) ?? 0,
      },
    ]),
  );
}

const subscriberViews = {
  everyone: {},
  users: { convertedAt: { not: null } },
  reading: { status: "ACTIVE", convertedAt: null, lastOpenedAt: { not: null } },
  neverOpened: { status: "ACTIVE", lastOpenedAt: null },
  unsubscribed: { status: "UNSUBSCRIBED" },
} satisfies Record<string, Prisma.SubscriberWhereInput>;

export const dispatchRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().trim(), password: z.string() }))
    .mutation(({ ctx, input }) => {
      const { email, password } = ctx.newsletter.admin;
      if (!email || !password) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dispatch sign-in is not configured" });
      }
      if (!loginLimit(ctx.ip ?? "unknown")) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts" });
      }
      const ok =
        safeEqual(input.email.toLowerCase(), email.toLowerCase()) && safeEqual(input.password, password);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong email or password" });
      return {
        token: adminToken(ctx.newsletter.secret, email, SESSION_TTL_MS),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      };
    }),

  me: adminProcedure.query(({ ctx }) => ({
    email: ctx.adminEmail,
    canSend: ctx.newsletter.mailer.enabled,
  })),

  // N1 · Overview, conversion rate first.
  overview: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const now = new Date();
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const before = new Date(now.getTime() - 60 * DAY_MS);
    const [audience, active, converted, joined30, joinedPrev, converted30, convertedPrev, unsubscribed30, sentIssues, recentConverts, nextOut, growth, rateMonthAgo] =
      await Promise.all([
        // Everyone still reading plus everyone who converted (even if they later left).
        db.subscriber.count({ where: { OR: [{ status: "ACTIVE" }, { convertedAt: { not: null } }] } }),
        db.subscriber.count({ where: { status: "ACTIVE" } }),
        db.subscriber.count({ where: { convertedAt: { not: null } } }),
        db.subscriber.count({ where: { subscribedAt: { gte: since } } }),
        db.subscriber.count({ where: { subscribedAt: { gte: before, lt: since } } }),
        db.subscriber.count({ where: { convertedAt: { gte: since } } }),
        db.subscriber.count({ where: { convertedAt: { gte: before, lt: since } } }),
        db.subscriber.count({ where: { unsubscribedAt: { gte: since } } }),
        db.issue.findMany({ where: { kind: "BROADCAST", status: "SENT" }, orderBy: { sentAt: "desc" }, take: 2 }),
        db.subscriber.findMany({
          where: { convertedAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
          orderBy: { convertedAt: "desc" },
          take: 6,
          select: { email: true, subscribedAt: true, convertedAt: true },
        }),
        db.issue.findFirst({ where: { status: "SCHEDULED" }, orderBy: { scheduledFor: "asc" } }),
        growthSeries(db),
        conversionRateAt(db, since),
      ]);
    const [lastIssue, previousIssue] = sentIssues;
    const stats = await issueStats(db, sentIssues.map((i) => i.id));
    const summary = (issue: typeof lastIssue) => {
      if (!issue) return null;
      const s = stats.get(issue.id)!;
      return {
        id: issue.id,
        number: issue.number,
        subject: issue.subject,
        sentAt: issue.sentAt,
        sent: s.sent,
        openRate: pct(s.opened, s.sent),
        clickRate: pct(s.clicked, s.sent),
        signups: s.signups,
      };
    };
    return {
      activeSubscribers: active,
      converted,
      conversionRate: pct(converted, audience),
      conversionRateMonthAgo: rateMonthAgo,
      last30Days: { joined: joined30, converted: converted30, unsubscribed: unsubscribed30 },
      previous30Days: { joined: joinedPrev, converted: convertedPrev },
      unsubscribeRate: pct(unsubscribed30, active + unsubscribed30),
      lastIssue: summary(lastIssue),
      previousIssue: summary(previousIssue),
      sentCount: await db.issue.count({ where: { kind: "BROADCAST", status: "SENT" } }),
      nextOut: nextOut && { id: nextOut.id, subject: nextOut.subject, scheduledFor: nextOut.scheduledFor },
      growth,
      recentConverts,
    };
  }),

  /** Rail badges and the "Next out" card, on every page. */
  shell: adminProcedure.query(async ({ ctx }) => {
    const [drafts, scheduled, nextOut] = await Promise.all([
      ctx.db.issue.count({ where: { kind: "BROADCAST", status: "DRAFT" } }),
      ctx.db.issue.count({ where: { status: { in: ["SCHEDULED", "SENDING"] } } }),
      ctx.db.issue.findFirst({ where: { status: { in: ["SCHEDULED", "SENDING"] } }, orderBy: { scheduledFor: "asc" } }),
    ]);
    return {
      email: ctx.adminEmail,
      canSend: ctx.newsletter.mailer.enabled,
      openIssues: drafts + scheduled,
      nextOut: nextOut && { id: nextOut.id, subject: nextOut.subject, status: nextOut.status, scheduledFor: nextOut.scheduledFor },
    };
  }),

  // N7 · Conversions.
  conversions: adminProcedure
    .input(z.object({ range: z.enum(["all", "quarter", "month"]).default("all") }))
    .query(({ ctx, input }) => conversionReport(ctx.db, input.range)),

  // N5 · Issue report.
  report: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const issue = await ctx.db.issue.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
    return issueReport(ctx.db, input.id, ctx.newsletter.webUrl);
  }),

  reportCsv: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => issueCsv(ctx.db, input.id)),

  /** N3 live preview and "View the email": the real rendered HTML. */
  preview: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        subject: z.string().max(200).optional(),
        previewText: z.string().max(200).nullish(),
        body: z.string().max(100_000).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const saved = input.id ? await ctx.db.issue.findUnique({ where: { id: input.id } }) : null;
      const settings = await getSettings(ctx.db);
      return renderEmail({
        label: issueLabel(saved ?? { kind: "BROADCAST", number: null }),
        subject: input.subject ?? saved?.subject ?? "",
        previewText: input.previewText ?? saved?.previewText,
        body: input.body ?? saved?.body ?? "",
        footer: settings.footer,
        unsubscribeUrl: `${ctx.newsletter.webUrl}/unsubscribe`,
      });
    }),

  // N6 · Subscribers.
  subscribers: adminProcedure
    .input(
      z.object({
        view: z.enum(["everyone", "users", "reading", "neverOpened", "unsubscribed"]).default("everyone"),
        search: z.string().trim().max(254).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.SubscriberWhereInput = {
        ...subscriberViews[input.view],
        ...(input.search ? { email: { contains: input.search.toLowerCase() } } : {}),
      };
      const [total, rows, viewCounts] = await Promise.all([
        ctx.db.subscriber.count({ where }),
        ctx.db.subscriber.findMany({
          where,
          orderBy: { subscribedAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        Promise.all(
          Object.entries(subscriberViews).map(
            async ([view, w]) => [view, await ctx.db.subscriber.count({ where: w })] as const,
          ),
        ),
      ]);
      const ids = rows.map((r) => r.id);
      const [sent, opened] = await Promise.all([
        ctx.db.delivery.groupBy({ by: ["subscriberId"], where: { subscriberId: { in: ids }, status: "SENT" }, _count: true }),
        ctx.db.delivery.groupBy({ by: ["subscriberId"], where: { subscriberId: { in: ids }, openedAt: { not: null } }, _count: true }),
      ]);
      const countFor = (list: { subscriberId: string; _count: number }[], id: string) =>
        list.find((r) => r.subscriberId === id)?._count ?? 0;
      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        views: Object.fromEntries(viewCounts),
        rows: rows.map((r) => ({
          ...r,
          issuesSent: countFor(sent, r.id),
          issuesOpened: countFor(opened, r.id),
          tag: r.convertedAt ? "USER" : r.status !== "ACTIVE" ? r.status : r.lastOpenedAt ? "READING" : "COLD",
        })),
      };
    }),

  // N2 · Issues, welcome pinned above the broadcasts.
  issues: adminProcedure.query(async ({ ctx }) => {
    const welcome = await ensureWelcomeIssue(ctx.db);
    const broadcasts = await ctx.db.issue.findMany({
      where: { kind: "BROADCAST" },
      orderBy: [{ number: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
    });
    const stats = await issueStats(ctx.db, [welcome.id, ...broadcasts.map((b) => b.id)]);
    const withStats = <T extends { id: string }>(issue: T) => {
      const s = stats.get(issue.id)!;
      return { ...issue, ...s, openRate: pct(s.opened, s.sent), conversionRate: pct(s.signups, s.sent) };
    };
    return { welcome: withStats(welcome), broadcasts: broadcasts.map(withStats) };
  }),

  issue: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const issue = await ctx.db.issue.findUnique({ where: { id: input.id } });
    if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
    return issue;
  }),

  // N3 · Editor. Drafts and the welcome email are editable; sent broadcasts are not.
  saveIssue: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        subject: z.string().trim().min(1).max(200),
        previewText: z.string().trim().max(200).nullish(),
        body: z.string().max(100_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (!id) return ctx.db.issue.create({ data: { ...data, kind: "BROADCAST", status: "DRAFT" } });
      const issue = await ctx.db.issue.findUnique({ where: { id } });
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
      if (issue.kind === "BROADCAST" && issue.status !== "DRAFT") {
        throw new TRPCError({ code: "CONFLICT", message: "Only drafts can be edited" });
      }
      return ctx.db.issue.update({ where: { id }, data });
    }),

  deleteDraft: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { count } = await ctx.db.issue.deleteMany({
      where: { id: input.id, kind: "BROADCAST", status: "DRAFT" },
    });
    if (count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No such draft" });
    return { ok: true };
  }),

  // N3/N4 · "Send a test", to the admin unless another address is given.
  sendTest: adminProcedure
    .input(z.object({ id: z.string(), to: z.string().email().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.newsletter.mailer.enabled) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMTP is not configured" });
      }
      const to = input.to ?? ctx.adminEmail;
      await sendTestIssue(ctx.db, ctx.newsletter, input.id, to);
      await ctx.db.issue.update({ where: { id: input.id }, data: { lastTestAt: new Date(), lastTestTo: to } });
      return { to };
    }),

  // N4 · Preflight: everything checked before the irreversible part.
  preflight: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const issue = await ctx.db.issue.findUnique({ where: { id: input.id } });
    if (!issue || issue.kind !== "BROADCAST") throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
    const [audience, settings, recent] = await Promise.all([
      audienceCount(ctx.db),
      getSettings(ctx.db),
      ctx.db.issue.findMany({
        where: { kind: "BROADCAST", status: "SENT" },
        orderBy: { sentAt: "desc" },
        take: 6,
        select: { id: true, number: true, subject: true },
      }),
    ]);
    const stats = await issueStats(ctx.db, recent.map((r) => r.id));
    const analysis = analyzeBody(issue.body, ctx.newsletter.webUrl);
    return {
      issue,
      audience,
      settings,
      canSend: ctx.newsletter.mailer.enabled,
      analysis,
      recent: recent.map((r) => {
        const s = stats.get(r.id)!;
        return { ...r, openRate: pct(s.opened, s.sent), signups: s.signups };
      }),
    };
  }),

  schedule: adminProcedure
    .input(z.object({ id: z.string(), at: z.coerce.date() }))
    .mutation(({ ctx, input }) => broadcastAction(() => scheduleIssue(ctx.db, input.id, input.at))),

  cancelSchedule: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => broadcastAction(() => cancelSchedule(ctx.db, input.id))),

  sendNow: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.newsletter.mailer.enabled) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMTP is not configured" });
    }
    return broadcastAction(() => startSend(ctx.db, input.id));
  }),

  /** Progress of a send in flight, for the preflight screen after "Send". */
  sendProgress: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const grouped = await ctx.db.delivery.groupBy({ by: ["status"], where: { issueId: input.id }, _count: true });
    const issue = await ctx.db.issue.findUnique({ where: { id: input.id }, select: { status: true, recipientCount: true } });
    return { status: issue?.status, total: issue?.recipientCount ?? 0, byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count])) };
  }),

  // N9 · Settings.
  settings: adminProcedure.query(({ ctx }) => getSettings(ctx.db)),

  saveSettings: adminProcedure
    .input(
      z.object({
        fromName: z.string().trim().min(1).max(100),
        fromAddress: z.string().trim().email().nullish(),
        replyTo: z.string().trim().email().nullish(),
        usualSlotDay: z.number().int().min(0).max(6),
        usualSlotTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        footer: z
          .string()
          .max(2000)
          .refine((s) => /\{\{\s*unsubscribe_url\s*\}\}/.test(s), "The footer must include {{ unsubscribe_url }}"),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.newsletterSettings.upsert({ where: { id: "default" }, create: input, update: input }),
    ),
});
