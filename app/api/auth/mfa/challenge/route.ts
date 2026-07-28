/**
 * POST /api/auth/mfa/challenge — complete login MFA
 * { mfaToken, code, rememberMe?, trustDevice? }
 * Prefer POST /api/auth/mfa/verify with mfaToken.
 */

export { POST } from "../verify/route";
