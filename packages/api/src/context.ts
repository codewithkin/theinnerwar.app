import type { Session } from "@theinnerwar.app/auth";
import type { Database } from "@theinnerwar.app/db";

export type Context = {
  session: Session | null;
  db: Database;
};
