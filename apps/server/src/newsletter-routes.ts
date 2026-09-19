import { processQueue } from "@theinnerwar.app/api/newsletter/broadcast";
import { recordClick, recordOpen, unsubscribe } from "@theinnerwar.app/api/newsletter/service";
import { readUnsubscribeToken, verifyClick, verifyOpen } from "@theinnerwar.app/api/newsletter/tokens";
import { Hono } from "hono";

import { createLogger } from "@theinnerwar.app/api/newsletter/log";

import { ENV } from "./env.server";
import { db, newsletter } from "./services";

// Non-tRPC newsletter endpoints that mail clients hit directly.
export const newsletterRoutes = new Hono();
const log = createLogger("newsletter.http");

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
      log.error("open failed", { deliveryId, error }),
    );
  } else {
    log.warn("open pixel with bad signature", { deliveryId });
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
    log.warn("click with bad signature: sent home instead", { deliveryId, url });
    return c.redirect(newsletter.webUrl, 302);
  }
  await recordClick(db, deliveryId, url, c.req.header("user-agent")).catch((error) =>
    log.error("click failed", { deliveryId, error }),
  );
  return c.redirect(url, 302);
});

// RFC 8058 one-click unsubscribe (the List-Unsubscribe-Post header): POST /n/u?t=<token>
newsletterRoutes.post("/u", async (c) => {
  const id = readUnsubscribeToken(newsletter.secret, c.req.query("t") ?? "");
  if (!id) {
    log.warn("one-click unsubscribe with bad token");
    return c.text("Invalid link", 400);
  }
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
    log.warn("cron rejected", { configured: Boolean(ENV.CRON_SECRET) });
    return c.text("Unauthorized", 401);
  }
  log.debug("cron tick");
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
      await processQueue(db, newsletter, { batch: ENV.NEWSLETTER_SEND_BATCH });
    } catch (error) {
      log.error("runner tick failed", { error });
    } finally {
      running = false;
    }
  };
  log.info("runner started", { intervalMs, batch: ENV.NEWSLETTER_SEND_BATCH });
  const timer = setInterval(tick, intervalMs);
  void tick();
  return () => clearInterval(timer);
}
