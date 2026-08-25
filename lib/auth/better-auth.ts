import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { prisma } from "@/lib/prisma";

const databaseUrl = process.env.DATABASE_URL;
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Better Auth");
}

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET (or NEXTAUTH_SECRET) must be at least 32 characters");
}

const pool = new Pool({
  connectionString: databaseUrl,
  options: "-c search_path=auth,public",
});

/**
 * Better Auth is the authentication/session provider for the runtime boundary.
 * OTTO IAM remains authoritative for identity, organization membership and RBAC.
 */
export const auth = betterAuth({
  database: pool,
  baseURL,
  secret,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Better Auth users must already exist in OTTO IAM. This prevents
          // authentication from creating an actor without a tenant boundary.
          const identity = await prisma.iamIdentity.findFirst({
            where: { email: user.email },
            select: { id: true, status: true },
          });

          if (!identity || identity.status === "disabled") {
            return false;
          }

          return undefined;
        },
      },
    },
  },
  plugins: [nextCookies()],
});
