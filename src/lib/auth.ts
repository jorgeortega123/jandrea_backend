import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { Bindings } from "../../types/types";

export function createAuth(db: D1Database, env: Bindings) {
  const adapter = new PrismaD1(db);
  const prisma = new PrismaClient({ adapter });

  return betterAuth({
    baseURL: "https://api.jandrea.art",
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "sqlite",
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      skipStateCookieCheck: true,
    },
    trustedOrigins: [
      "https://store.jandrea.art",
      "https://jandrea.art",
      "https://www.jandrea.art",
      "http://localhost:3000",
    ],

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}
