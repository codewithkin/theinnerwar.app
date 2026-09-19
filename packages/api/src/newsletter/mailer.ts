import nodemailer from "nodemailer";

// Manual SMTP through nodemailer; every value comes from the server env.

export type SmtpConfig = {
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
  /** False when SMTP_HOST is not configured; sends are then skipped. */
  enabled: boolean;
  defaultFrom?: string;
  defaultReplyTo?: string;
  send(mail: OutgoingMail): Promise<{ messageId: string }>;
};

export function createMailer(config: SmtpConfig): Mailer {
  if (!config.host) {
    return {
      enabled: false,
      async send() {
        throw new Error("SMTP is not configured (set SMTP_HOST and friends in the server env)");
      },
    };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.secure ?? false,
    auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return {
    enabled: true,
    defaultFrom: config.from,
    defaultReplyTo: config.replyTo,
    async send(mail) {
      const from = mail.from ?? config.from ?? config.user;
      if (!from) throw new Error("No sender address: set MAIL_FROM");
      const info = await transport.sendMail({
        from,
        replyTo: mail.replyTo ?? config.replyTo,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
      });
      return { messageId: info.messageId };
    },
  };
}
