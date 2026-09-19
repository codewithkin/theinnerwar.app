import nodemailer from "nodemailer";

import { createLogger } from "./log";

// SMTP through nodemailer; every value comes from the server env. The server
// runs two of these: `noreply` (account mail) and `newsletter` (the letters),
// each signed in as its own mailbox.

export type SmtpConfig = {
  /** Names the mailbox in logs and errors, e.g. "newsletter" or "noreply". */
  label: string;
  /** Env var prefix, for error messages, e.g. "NEWSLETTER_". */
  envPrefix: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
  replyTo?: string;
};

export type OutgoingMail = {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type Mailer = {
  label: string;
  /** False unless host, user and password are all set; sends are then skipped. */
  enabled: boolean;
  defaultFrom?: string;
  defaultReplyTo?: string;
  send(mail: OutgoingMail): Promise<{ messageId: string }>;
};

export function createMailer(config: SmtpConfig): Mailer {
  const log = createLogger(`mail.${config.label}`);
  const p = config.envPrefix;
  const missing = [
    !config.host && `${p}SMTP_HOST`,
    !config.user && `${p}SMTP_USER`,
    !config.password && `${p}SMTP_PASSWORD`,
  ].filter(Boolean);

  if (missing.length) {
    log.warn("mailbox not configured: sending disabled", { missing });
    return {
      label: config.label,
      enabled: false,
      defaultFrom: config.from,
      defaultReplyTo: config.replyTo,
      async send() {
        throw new Error(`The ${config.label} mailbox is not configured (set ${missing.join(", ")})`);
      },
    };
  }

  const port = config.port ?? 465;
  const secure = config.secure ?? port === 465;
  log.info("mailbox configured", { host: config.host, port, secure, user: config.user, from: config.from });
  const transport = nodemailer.createTransport({
    host: config.host,
    port,
    secure,
    auth: { user: config.user!, pass: config.password! },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return {
    label: config.label,
    enabled: true,
    defaultFrom: config.from,
    defaultReplyTo: config.replyTo,
    async send(mail) {
      // Mailbox providers reject a From that isn't the signed-in mailbox, so the
      // login address is the fallback sender.
      const from = mail.from ?? config.from ?? config.user;
      const started = Date.now();
      const info = await transport.sendMail({
        from,
        replyTo: mail.replyTo ?? config.replyTo,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
      });
      log.debug("smtp accepted", {
        messageId: info.messageId,
        ms: Date.now() - started,
        accepted: info.accepted?.length,
        rejected: info.rejected?.length,
        response: info.response,
      });
      return { messageId: info.messageId };
    },
  };
}
