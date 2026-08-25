import { createAuth } from "@/lib/platform/identity/authentication/provider";

/**
 * AUTH-002 provider boundary.
 *
 * Better Auth owns credential/session persistence; OTTO's IdentityService
 * remains authoritative for tenant membership and authorization.
 */
export const betterAuth = createAuth();
