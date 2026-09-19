import { TRPCError } from "@trpc/server";
import z from "zod";

import { publicProcedure, router } from "../index";

export const catalogRouter = router({
  books: publicProcedure.query(({ ctx }) =>
    ctx.db.book.findMany({ orderBy: { sortOrder: "asc" } }),
  ),

  paths: publicProcedure.query(({ ctx }) =>
    ctx.db.path.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { book: { select: { slug: true, title: true, author: true } } },
    }),
  ),

  path: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const path = await ctx.db.path.findFirst({
      where: { slug: input.slug, published: true },
      include: {
        book: true,
        chapters: { orderBy: { number: "asc" } },
        // Day 1 is free on every path and readable before signing in (W2).
        days: { where: { dayNumber: 1 } },
      },
    });
    if (!path) throw new TRPCError({ code: "NOT_FOUND", message: "Path not found" });
    const { days, ...rest } = path;
    return { ...rest, sampleDay: days[0] ?? null };
  }),
});
