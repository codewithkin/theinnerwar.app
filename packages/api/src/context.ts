import type { Session } from "@theinnerwar.app/auth";
import type { Database } from "@theinnerwar.app/db";

import type { NewsletterContext } from "./newsletter/context";

export type Context = {
  session: Session | null;
  db: Database;
  newsletter: NewsletterContext;
  /** Best-effort client address, for rate limiting. */
  ip: string | null;
  userAgent: string | null;
  /** Raw Authorization header (Dispatch admin bearer token). */
  authorization: string | null;
};
