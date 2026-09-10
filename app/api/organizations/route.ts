/**
 * Legacy compatibility route.
 *
 * Organization state and creation are authoritative in OTTO IAM at
 * /api/auth/organizations. Keep this path as a compatibility alias so older
 * clients do not create a legacy tenant boundary behind the IAM layer.
 */

export { GET, POST } from "@/app/api/auth/organizations/route";
