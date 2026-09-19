import { createAuth } from "@theinnerwar.app/auth";
import { createPrismaClient } from "@theinnerwar.app/db";
import type { NewsletterContext } from "@theinnerwar.app/api/newsletter/context";
import { createMailer } from "@theinnerwar.app/api/newsletter/mailer";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);

/** noreply@theinnerwar.app: account mail (magic links, resets, account notices). */
export const accountMailer = createMailer({
  label: "noreply",
  envPrefix: "NOREPLY_",
  host: ENV.NOREPLY_SMTP_HOST,
  port: ENV.NOREPLY_SMTP_PORT,
  secure: ENV.NOREPLY_SMTP_SECURE,
  user: ENV.NOREPLY_SMTP_USER,
  password: ENV.NOREPLY_SMTP_PASSWORD,
  from: ENV.NOREPLY_MAIL_FROM,
});

/** newsletter@theinnerwar.app: the letters (welcome email, broadcasts, tests). */
export const newsletterMailer = createMailer({
  label: "newsletter",
  envPrefix: "NEWSLETTER_",
  host: ENV.NEWSLETTER_SMTP_HOST,
  port: ENV.NEWSLETTER_SMTP_PORT,
  secure: ENV.NEWSLETTER_SMTP_SECURE,
  user: ENV.NEWSLETTER_SMTP_USER,
  password: ENV.NEWSLETTER_SMTP_PASSWORD,
  from: ENV.NEWSLETTER_MAIL_FROM,
  replyTo: ENV.NEWSLETTER_MAIL_REPLY_TO,
});

export const auth = createAuth(ENV, db, [], accountMailer);

export const newsletter: NewsletterContext = {
  mailer: newsletterMailer,
  // Domain-separated from auth by the token purpose prefix (see newsletter/tokens.ts).
  secret: ENV.BETTER_AUTH_SECRET,
  serverUrl: ENV.SERVER_PUBLIC_URL,
  webUrl: ENV.CORS_ORIGIN,
  admin: { email: ENV.DISPATCH_ADMIN_EMAIL, password: ENV.DISPATCH_ADMIN_PASSWORD },
};
