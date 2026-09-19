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

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
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
    emailAndPassword: { enabled: true },
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
