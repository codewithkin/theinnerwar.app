import { protectedProcedure, publicProcedure, router } from "../index";
import { campaignRouter } from "./campaign";
import { catalogRouter } from "./catalog";
import { dispatchRouter } from "./dispatch";
import { evidenceRouter } from "./evidence";
import { newsletterRouter } from "./newsletter";
import { onboardingRouter } from "./onboarding";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  catalog: catalogRouter,
  onboarding: onboardingRouter,
  campaign: campaignRouter,
  evidence: evidenceRouter,
  newsletter: newsletterRouter,
  dispatch: dispatchRouter,
});
export type AppRouter = typeof appRouter;
