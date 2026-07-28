/**
 * Auth entrypoint — IAM platform (NextAuth removed).
 *
 * Historical next-auth options lived here; A.1–cutover replaced them with
 * native session cookies + CurrentIdentityService.
 *
 * Prefer:
 *   import { getServerSession } from "@/lib/auth/session"
 * or platform middleware:
 *   import { requireAuthentication } from "@/lib/platform/identity"
 */

export {
  getServerSession,
  requireServerSession,
  resolveIdentityFromHeaders,
  toAuthSession,
  type AuthSession,
  type AuthSessionUser,
} from "./auth/session";

/**
 * @deprecated No-op stub kept so accidental authOptions imports do not crash.
 * Remove remaining references as modules migrate to IAM middleware.
 */
export const authOptions = {
  providers: [],
  session: { strategy: "jwt" as const },
  secret: process.env.IAM_ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET,
};
