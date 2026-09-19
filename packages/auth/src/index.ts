import { expo } from "@better-auth/expo";
import type { Database } from "@theinnerwar.app/db";
import { linkSubscriberToUser } from "@theinnerwar.app/db/newsletter";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

/**
 * The noreply@ mailbox (account mail: magic links, password resets, account
 * notices). Structural, so this package doesn't depend on the mailer's package.
 */
export type AccountMailer = {
  enabled: boolean;
  send(mail: { to: string; subject: string; html: string; text: string }): Promise<unknown>;
};

function accountEmail(heading: string, body: string, action: { label: string; url: string }) {
  const text = `${heading}

${body}

${action.label}: ${action.url}

If you didn't ask for this, ignore this email.

The Inner War`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:32px 12px;background:#e9e3d8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#f7f3ec;">
<tr><td style="padding:40px 44px;font-family:Georgia,serif;color:#37332c;">
<div style="font-family:Menlo,monospace;font-size:10px;letter-spacing:0.2em;color:#8a7f6d;padding-bottom:16px;border-bottom:1px solid #ddd6c8;margin-bottom:24px;"><span style="color:#e2701f;">&#9679;</span>&nbsp;&nbsp;THE INNER WAR</div>
<h1 style="margin:0 0 16px;font-weight:400;font-size:30px;line-height:1.1;color:#1b1a16;">${heading}</h1>
<p style="margin:0 0 24px;font-size:17px;line-height:1.6;">${body}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#e2701f;"><a href="${action.url}" style="display:inline-block;padding:13px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#fff6ea;text-decoration:none;">${action.label}</a></td></tr></table>
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #ddd6c8;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a7f6d;">If you didn't ask for this, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { html, text };
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
  accountMail?: AccountMailer,
) {
  return betterAuth({
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,
      ...desktopOrigins,
      "theinnerwar.app://",
      "exp://",
      "http://localhost:8081",
    ],
    emailAndPassword: {
      enabled: true,
      // Sent from noreply@ (account mail), never from the newsletter mailbox.
      sendResetPassword: async ({ user, url }) => {
        if (!accountMail?.enabled) {
          console.warn("[auth] password reset requested but the noreply mailbox is not configured", { userId: user.id });
          return;
        }
        const { html, text } = accountEmail(
          "Reset your password.",
          "Someone asked to reset the password for your Inner War account. The link works once and expires in an hour.",
          { label: "Choose a new password", url },
        );
        try {
          await accountMail.send({ to: user.email, subject: "Reset your password", html, text });
          console.info("[auth] password reset email sent", { userId: user.id });
        } catch (error) {
          console.error("[auth] password reset email failed", { userId: user.id, error });
          throw error;
        }
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [expo()],
    databaseHooks: {
      user: {
        create: {
          // Newsletter conversion: a reader who became a user (Dispatch N7).
          after: async (user) => {
            try {
              await linkSubscriberToUser(database, user);
            } catch (error) {
              console.error("[newsletter] failed to link subscriber to user", error);
            }
          },
        },
      },
    },
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
