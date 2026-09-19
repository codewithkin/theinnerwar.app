import { createAuth } from "@theinnerwar.app/auth";
import { createPrismaClient } from "@theinnerwar.app/db";
import type { NewsletterContext } from "@theinnerwar.app/api/newsletter/context";
import { createMailer } from "@theinnerwar.app/api/newsletter/mailer";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);

export const newsletter: NewsletterContext = {
  mailer: createMailer({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    user: ENV.SMTP_USER,
    password: ENV.SMTP_PASSWORD,
    from: ENV.MAIL_FROM,
    replyTo: ENV.MAIL_REPLY_TO,
  }),
  // Domain-separated from auth by the token purpose prefix (see newsletter/tokens.ts).
  secret: ENV.BETTER_AUTH_SECRET,
  serverUrl: ENV.SERVER_PUBLIC_URL,
  webUrl: ENV.CORS_ORIGIN,
  admin: { email: ENV.DISPATCH_ADMIN_EMAIL, password: ENV.DISPATCH_ADMIN_PASSWORD },
};
