import z from "zod";

import {
  BATTLES,
  DAILY_MINUTES,
  PATTERNS,
  TONES,
  battleKeys,
  patternKeys,
  toneKeys,
} from "../domain/onboarding";
import { recommendPath } from "../domain/recommend";
import { protectedProcedure, publicProcedure, router } from "../index";

const answers = z.object({
  battles: z.array(z.enum(battleKeys)).max(battleKeys.length),
  pattern: z.enum(patternKeys).nullish(),
  bookSlug: z.string().nullish(),
});

export const onboardingRouter = router({
  options: publicProcedure.query(() => ({
    battles: BATTLES,
    patterns: PATTERNS,
    dailyMinutes: DAILY_MINUTES,
    tones: TONES,
  })),

  // The path reveal (S8) happens before any account exists, so this is public.
  recommend: publicProcedure.input(answers).query(async ({ ctx, input }) => {
    const paths = await ctx.db.path.findMany({
      where: { published: true },
      include: { book: { select: { slug: true, title: true, author: true } } },
    });
    const candidates = paths.map((p) => ({ ...p, bookSlug: p.book.slug }));
    return recommendPath(input, candidates);
  }),

  get: protectedProcedure.query(({ ctx }) =>
    ctx.db.assessment.findUnique({ where: { userId: ctx.session.user.id } }),
  ),

  // Answers gathered before sign-up are saved here once the account exists (S11).
  save: protectedProcedure
    .input(
      answers.partial().extend({
        dailyMinutes: z.number().int().min(1).max(120).optional(),
        tone: z.enum(toneKeys).optional(),
        lifeArea: z.string().max(40).nullish(),
        complete: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { complete, ...data } = input;
      const userId = ctx.session.user.id;
      const completedAt = complete ? new Date() : undefined;
      return ctx.db.assessment.upsert({
        where: { userId },
        create: { ...data, userId, completedAt },
        update: { ...data, completedAt },
      });
    }),
});
