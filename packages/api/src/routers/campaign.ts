import type { Database } from "@theinnerwar.app/db";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { canOpenDay } from "../domain/access";
import { buildLedger, countHeld, shouldAdvance } from "../domain/ledger";
import { protectedProcedure, router } from "../index";

const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

async function findActive(db: Database, userId: string) {
  return db.campaign.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: {
      path: { include: { book: true, chapters: { orderBy: { number: "asc" } } } },
      entries: { orderBy: { dayNumber: "asc" } },
    },
  });
}

/** The active campaign, moved on to the next day once a kept day has passed. */
async function loadActive(db: Database, userId: string, now = new Date()) {
  const campaign = await findActive(db, userId);
  if (!campaign) return null;
  const current = campaign.entries.find((e) => e.dayNumber === campaign.currentDay);
  const keptAt = current?.status === "KEPT" ? current.evidenceSavedAt : null;
  if (
    shouldAdvance({
      currentDay: campaign.currentDay,
      lengthDays: campaign.path.lengthDays,
      keptAt,
      now,
      timeZone: campaign.timezone,
    })
  ) {
    await db.campaign.update({
      where: { id: campaign.id },
      data: { currentDay: campaign.currentDay + 1 },
    });
    return findActive(db, userId);
  }
  return campaign;
}

async function requireActive(db: Database, userId: string) {
  const campaign = await loadActive(db, userId);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "No active campaign" });
  return campaign;
}

/** The current day's entry, created on first touch; refuses days behind the paywall. */
async function openCurrentDay(db: Database, userId: string) {
  const campaign = await requireActive(db, userId);
  const entitlements = await db.entitlement.findMany({ where: { userId } });
  if (
    !canOpenDay({
      dayNumber: campaign.currentDay,
      freeDays: campaign.path.freeDays,
      entitlements,
      now: new Date(),
    })
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This day belongs to the full campaign." });
  }
  const pathDay = await db.pathDay.findUnique({
    where: { pathId_dayNumber: { pathId: campaign.pathId, dayNumber: campaign.currentDay } },
  });
  if (!pathDay) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This day has not been written yet." });
  }
  const entry = await db.dayEntry.upsert({
    where: { campaignId_dayNumber: { campaignId: campaign.id, dayNumber: campaign.currentDay } },
    create: { campaignId: campaign.id, pathDayId: pathDay.id, dayNumber: campaign.currentDay },
    update: {},
  });
  return { campaign, pathDay, entry };
}

function keptIfComplete(entry: { missionCompletedAt: Date | null; evidenceSavedAt: Date | null }) {
  return entry.missionCompletedAt && entry.evidenceSavedAt ? ("KEPT" as const) : undefined;
}

export const campaignRouter = router({
  active: protectedProcedure.query(async ({ ctx }) => {
    const campaign = await loadActive(ctx.db, ctx.session.user.id);
    if (!campaign) return null;
    const chapter = campaign.path.chapters.find(
      (c) => c.startDay <= campaign.currentDay && campaign.currentDay <= c.endDay,
    );
    const ledger = buildLedger({
      lengthDays: campaign.path.lengthDays,
      currentDay: campaign.currentDay,
      entries: campaign.entries,
      chapterEndDay: chapter?.endDay,
    });
    return { ...campaign, chapter: chapter ?? null, ledger, ...countHeld(ledger) };
  }),

  start: protectedProcedure
    .input(
      z.object({
        pathSlug: z.string(),
        missionHour: hour.optional(),
        timezone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (await findActive(ctx.db, userId)) {
        throw new TRPCError({ code: "CONFLICT", message: "A campaign is already active." });
      }
      const path = await ctx.db.path.findFirst({ where: { slug: input.pathSlug, published: true } });
      if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Path not found" });
      if (input.timezone) {
        try {
          new Intl.DateTimeFormat("en", { timeZone: input.timezone });
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown timezone" });
        }
      }
      return ctx.db.campaign.create({
        data: {
          userId,
          pathId: path.id,
          missionHour: input.missionHour,
          timezone: input.timezone ?? "UTC",
        },
      });
    }),

  today: protectedProcedure.query(async ({ ctx }) => {
    const campaign = await loadActive(ctx.db, ctx.session.user.id);
    if (!campaign) return null;
    const entitlements = await ctx.db.entitlement.findMany({
      where: { userId: ctx.session.user.id },
    });
    const locked = !canOpenDay({
      dayNumber: campaign.currentDay,
      freeDays: campaign.path.freeDays,
      entitlements,
      now: new Date(),
    });
    const pathDay = locked
      ? null
      : await ctx.db.pathDay.findUnique({
          where: {
            pathId_dayNumber: { pathId: campaign.pathId, dayNumber: campaign.currentDay },
          },
        });
    const entry = campaign.entries.find((e) => e.dayNumber === campaign.currentDay) ?? null;
    return { dayNumber: campaign.currentDay, locked, pathDay, entry };
  }),

  readLesson: protectedProcedure.mutation(async ({ ctx }) => {
    const { entry } = await openCurrentDay(ctx.db, ctx.session.user.id);
    return ctx.db.dayEntry.update({
      where: { id: entry.id },
      data: { lessonReadAt: entry.lessonReadAt ?? new Date() },
    });
  }),

  startMission: protectedProcedure
    .input(z.object({ variant: z.enum(["FULL", "SMALLER"]).default("FULL") }))
    .mutation(async ({ ctx, input }) => {
      const { entry } = await openCurrentDay(ctx.db, ctx.session.user.id);
      return ctx.db.dayEntry.update({
        where: { id: entry.id },
        data: { missionStartedAt: entry.missionStartedAt ?? new Date(), missionVariant: input.variant },
      });
    }),

  completeMission: protectedProcedure
    .input(
      z.object({
        variant: z.enum(["FULL", "SMALLER"]).optional(),
        minutesHeld: z.number().int().min(0).max(600).optional(),
        // S9: "I will begin by..." (140 characters).
        firstMove: z.string().trim().min(1).max(140).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { entry } = await openCurrentDay(ctx.db, ctx.session.user.id);
      const missionCompletedAt = entry.missionCompletedAt ?? new Date();
      return ctx.db.dayEntry.update({
        where: { id: entry.id },
        data: {
          missionCompletedAt,
          missionVariant: input.variant ?? entry.missionVariant ?? "FULL",
          minutesHeld: input.minutesHeld ?? entry.minutesHeld,
          firstMove: input.firstMove ?? entry.firstMove,
          status: keptIfComplete({ missionCompletedAt, evidenceSavedAt: entry.evidenceSavedAt }),
        },
      });
    }),

  // A5: reflection and evidence are saved together; evidence is one sentence (200 chars).
  saveEvidence: protectedProcedure
    .input(
      z.object({
        evidence: z.string().trim().min(1).max(200),
        reflection: z.string().trim().max(2000).optional(),
        difficulty: z.enum(["EASY", "STEADY", "HARD", "BRUTAL"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { entry } = await openCurrentDay(ctx.db, ctx.session.user.id);
      const evidenceSavedAt = new Date();
      return ctx.db.dayEntry.update({
        where: { id: entry.id },
        data: {
          evidence: input.evidence,
          reflection: input.reflection ?? entry.reflection,
          difficulty: input.difficulty ?? entry.difficulty,
          evidenceSavedAt,
          status: keptIfComplete({ missionCompletedAt: entry.missionCompletedAt, evidenceSavedAt }),
        },
      });
    }),
});
