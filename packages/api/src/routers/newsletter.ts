import { TRPCError } from "@trpc/server";
import z from "zod";

import { publicProcedure, router } from "../index";
import { createLogger, redactEmail } from "../newsletter/log";
import { createRateLimiter } from "../newsletter/rate-limit";
import {
  UndeliverableError,
  maskEmail,
  subscribe,
  unsubscribe,
  type SubscribeResult,
} from "../newsletter/service";
import { readUnsubscribeToken } from "../newsletter/tokens";

const log = createLogger("newsletter.api");

const perIp = createRateLimiter(8, 10 * 60 * 1000);
const perEmail = createRateLimiter(3, 10 * 60 * 1000);

const short = z.string().trim().max(200).optional();

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

// Public newsletter routes used by the website.
export const newsletterRouter = router({
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().trim().max(254).email("Enter a valid email address"),
        source: short,
        pagePath: short,
        referrer: z.string().trim().max(500).optional(),
        utmSource: short,
        utmMedium: short,
        utmCampaign: short,
        utmTerm: short,
        utmContent: short,
        timezone: z.string().trim().max(64).optional(),
        // Honeypot: real people never see or fill this field.
        company: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SubscribeResult> => {
      const { email, company, ...meta } = input;
      if (company) {
        log.warn("honeypot filled: ignoring signup", { ip: ctx.ip, source: meta.source });
        return { state: "subscribed", email, emailSent: true };
      }

      if (!perIp(ctx.ip ?? "unknown") || !perEmail(email.toLowerCase())) {
        log.warn("rate limited", { ip: ctx.ip, email: redactEmail(email) });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Give it a few minutes and try again.",
        });
      }

      try {
        return await subscribe(ctx.db, ctx.newsletter, email, meta);
      } catch (error) {
        if (error instanceof UndeliverableError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        // Two submits raced; the other one created the subscriber.
        if (isUniqueViolation(error)) return { state: "already", email, emailSent: false };
        log.error("subscribe failed", { email: redactEmail(email), error });
        throw error;
      }
    }),

  /** The /unsubscribe page: stops mail immediately and shows which address. */
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string().max(200) }))
    .mutation(async ({ ctx, input }) => {
      const id = readUnsubscribeToken(ctx.newsletter.secret, input.token);
      const subscriber = id ? await unsubscribe(ctx.db, id) : null;
      if (!subscriber) {
        log.warn("unsubscribe with invalid token", { validSignature: Boolean(id) });
        throw new TRPCError({ code: "NOT_FOUND", message: "This unsubscribe link is not valid." });
      }
      return { email: maskEmail(subscriber.email) };
    }),

  /** "Changed your mind?" on the unsubscribe page. No welcome email is re-sent. */
  resubscribe: publicProcedure
    .input(z.object({ token: z.string().max(200) }))
    .mutation(async ({ ctx, input }) => {
      const id = readUnsubscribeToken(ctx.newsletter.secret, input.token);
      const subscriber = id ? await ctx.db.subscriber.findUnique({ where: { id } }) : null;
      if (!subscriber) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This link is not valid." });
      }
      log.info("resubscribe from unsubscribe page", { subscriberId: subscriber.id, status: subscriber.status });
      if (subscriber.status === "UNSUBSCRIBED") {
        await ctx.db.subscriber.update({
          where: { id: subscriber.id },
          data: { status: "ACTIVE", resubscribedAt: new Date(), unsubscribedAt: null },
        });
      }
      return { email: maskEmail(subscriber.email) };
    }),
});
