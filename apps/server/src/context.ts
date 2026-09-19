import type { Context as ApiContext } from "@theinnerwar.app/api/context";
import type { Context as HonoContext } from "hono";

import { auth, db, newsletter } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null
  );
}

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const headers = context.req.raw.headers;
  const session = await auth.api.getSession({ headers });
  return {
    db,
    session,
    newsletter,
    ip: clientIp(headers),
    userAgent: headers.get("user-agent"),
    authorization: headers.get("authorization"),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
