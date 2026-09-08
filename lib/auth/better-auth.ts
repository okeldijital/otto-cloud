import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { sendOttoEmail } from "@/lib/email/resend";

const configuredDatabaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const databaseUrl = configuredDatabaseUrl?.replace(
  /^(postgres(?:ql)?:\/\/[^@]+@)([^/?#]+)(.*)$/,
  (_match, prefix: string, host: string, suffix: string) =>
    `${prefix}${host.replace(/-pooler(?=\.)/, "")}${suffix}`,
);
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required for Better Auth");
}

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET (or NEXTAUTH_SECRET) must be at least 32 characters");
}

const pool = new Pool({
  connectionString: databaseUrl,
  options: "-c search_path=auth,public",
});

void pool
  .query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS current_schema,
      current_setting('search_path') AS search_path,
      to_regclass('auth.account') IS NOT NULL AS auth_account_exists,
      to_regclass('auth.session') IS NOT NULL AS auth_session_exists,
      to_regclass('auth.user') IS NOT NULL AS auth_user_exists,
      to_regclass('auth.verification') IS NOT NULL AS auth_verification_exists,
      EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'auth'
          AND tablename = 'account'
          AND indexname = 'account_issuer_accountId_key'
      ) AS stale_issuer_index_exists
  `)
  .then(({ rows }) => {
    console.info("[OTTO Auth DB Diagnostic]", rows[0]);
  })
  .catch((error) => {
    console.error("[OTTO Auth DB Diagnostic] query failed", error);
  });

/**
 * Better Auth is the authentication/session provider for the runtime boundary.
 * OTTO IAM remains authoritative for identity, organization membership and RBAC.
 *
 * Neon pooled connections reject session startup parameters such as search_path.
 * Prefer DATABASE_URL_UNPOOLED when supplied; otherwise derive the direct Neon
 * endpoint from DATABASE_URL so the auth schema can safely use search_path.
 */
export const auth = betterAuth({
  database: pool,
  baseURL,
  secret,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendOttoEmail({
        to: user.email,
        subject: "Verify your OTTO Cloud email address",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 560px; margin: 0 auto;">
            <h1>Verify your OTTO Cloud account</h1>
            <p>Hello ${user.name || "there"},</p>
            <p>Confirm your email address to finish creating your OTTO Cloud account.</p>
            <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Verify email address</a></p>
            <p>If you did not create this account, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
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
  plugins: [nextCookies()],
});
