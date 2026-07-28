/**
 * Auth entrypoint — IAM platform only (A.4.5 cutover).
 *
 * Prefer Platform SDK for new code:
 *   import { requireAuthentication, requirePermission } from "@/lib/platform/sdk"
 */

export {
  getServerSession,
  requireServerSession,
  resolveIdentityFromHeaders,
  toAuthSession,
  type AuthSession,
  type AuthSessionUser,
} from "./auth/session";
