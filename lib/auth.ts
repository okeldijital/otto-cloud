/**
 * Auth entrypoint — IAM platform only (A.4.5 cutover).
 *
 * Prefer platform middleware for new code:
 *   import { requireAuthentication, requirePermission } from "@/lib/platform/identity"
 */

export {
  getServerSession,
  requireServerSession,
  resolveIdentityFromHeaders,
  toAuthSession,
  type AuthSession,
  type AuthSessionUser,
} from "./auth/session";
