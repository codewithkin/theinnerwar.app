import z from "zod";

import { protectedProcedure, router } from "../index";

export const evidenceRouter = router({
  // B2 evidence library: newest first, across every campaign unless one is named.
  list: protectedProcedure
    .input(z.object({ campaignId: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db.dayEntry.findMany({
        where: {
          evidence: { not: null },
          campaign: { userId: ctx.session.user.id, id: input?.campaignId },
        },
        orderBy: [{ evidenceSavedAt: "desc" }],
        select: {
          id: true,
          dayNumber: true,
          status: true,
          evidence: true,
          difficulty: true,
          evidenceSavedAt: true,
          campaign: { select: { id: true, path: { select: { slug: true, title: true } } } },
        },
      }),
    ),
});
