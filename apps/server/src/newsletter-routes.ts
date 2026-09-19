import { processQueue } from "@theinnerwar.app/api/newsletter/broadcast";
import { recordClick, recordOpen, unsubscribe } from "@theinnerwar.app/api/newsletter/service";
import { readUnsubscribeToken, verifyClick, verifyOpen } from "@theinnerwar.app/api/newsletter/tokens";
import { Hono } from "hono";

import { ENV } from "./env.server";
import { db, newsletter } from "./services";

// Non-tRPC newsletter endpoints that mail clients hit directly.
export const newsletterRoutes = new Hono();

// 1×1 transparent GIF.
const PIXEL = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

// Open tracking: GET /n/o/:deliveryId?s=<sig>
newsletterRoutes.get("/o/:deliveryId", async (c) => {
  const { deliveryId } = c.req.param();
  const sig = c.req.query("s") ?? "";
  if (verifyOpen(newsletter.secret, deliveryId, sig)) {
    await recordOpen(db, deliveryId, c.req.header("user-agent")).catch((error) =>
      console.error("[newsletter] open", error),
    );
  }
  return c.body(PIXEL, 200, {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  });
});

// Click tracking: GET /n/c/:deliveryId?u=<url>&s=<sig> → 302 to the signed URL only.
newsletterRoutes.get("/c/:deliveryId", async (c) => {
  const { deliveryId } = c.req.param();
  const url = c.req.query("u") ?? "";
  const sig = c.req.query("s") ?? "";
  if (!/^https?:\/\//i.test(url) || !verifyClick(newsletter.secret, deliveryId, url, sig)) {
    return c.redirect(newsletter.webUrl, 302);
  }
  await recordClick(db, deliveryId, url, c.req.header("user-agent")).catch((error) =>
    console.error("[newsletter] click", error),
  );
  return c.redirect(url, 302);
});

// RFC 8058 one-click unsubscribe (the List-Unsubscribe-Post header): POST /n/u?t=<token>
newsletterRoutes.post("/u", async (c) => {
  const id = readUnsubscribeToken(newsletter.secret, c.req.query("t") ?? "");
  if (!id) return c.text("Invalid link", 400);
  await unsubscribe(db, id, "one-click");
  return c.text("Unsubscribed");
});

// A GET on the header link (some clients do this) goes to the confirmation page.
newsletterRoutes.get("/u", (c) =>
  c.redirect(`${newsletter.webUrl}/unsubscribe?t=${encodeURIComponent(c.req.query("t") ?? "")}`, 302),
);

// Broadcast runner tick (Vercel Cron, or any external scheduler):
// GET /n/cron with "Authorization: Bearer <CRON_SECRET>".
newsletterRoutes.get("/cron", async (c) => {
  if (!ENV.CRON_SECRET || c.req.header("authorization") !== `Bearer ${ENV.CRON_SECRET}`) {
    return c.text("Unauthorized", 401);
  }
  return c.json(await processQueue(db, newsletter, { batch: ENV.NEWSLETTER_SEND_BATCH }));
});

/**
 * In a long-running process (local dev, Docker) the server ticks the queue
 * itself every minute. On Vercel functions don't persist, so the cron above
 * is used instead.
 */
export function startNewsletterRunner(intervalMs = 60_000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await processQueue(db, newsletter, { batch: ENV.NEWSLETTER_SEND_BATCH });
      if (result.started || result.sent || result.failed || result.finished) {
        console.log("[newsletter] runner", result);
      }
    } catch (error) {
      console.error("[newsletter] runner failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  void tick();
  return () => clearInterval(timer);
}
