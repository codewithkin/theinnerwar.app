import type { Mailer } from "./mailer";

/** Everything the newsletter needs from the server, injected via the tRPC context. */
export type NewsletterContext = {
  mailer: Mailer;
  /** Signs unsubscribe, tracking and Dispatch session tokens. */
  secret: string;
  /** Public base URL of the API server (tracking and one-click unsubscribe routes). */
  serverUrl: string;
  /** Public base URL of the website (the /unsubscribe page). */
  webUrl: string;
  admin: { email?: string; password?: string };
};

export function trimSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
