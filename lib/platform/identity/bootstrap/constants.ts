/**
 * Shared bootstrap constants.
 */

/**
 * Well-formed UUID (RFC 4122 v4 / variant 8) used as the platform envelope
 * organizationId when an identity event has no tenant context (e.g. failed login
 * before org resolution). Must pass event-schema UUID validation — the nil UUID
 * does not (version nibble 0 is invalid).
 */
export const PLATFORM_SYSTEM_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000000";

/** Marker written to org policies when created by bootstrap-iam */
export const BOOTSTRAP_POLICY_MARKER = {
  bootstrappedBy: "bootstrap-iam",
  bootstrapVersion: 1,
} as const;
