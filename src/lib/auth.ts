import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Bindings } from "../../types/types";
import { getPrismaClient } from "./prismaClients";

export function createAuth(db: D1Database, env: Bindings) {
  // Reutiliza el PrismaClient compartido del isolate (antes creaba otro motor
  // WASM de Prisma en cada petición de auth/sesión).
  const prisma = getPrismaClient(db);

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
