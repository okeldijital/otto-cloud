/**
 * Canonical permission keys for RBAC (A.6).
 * Format: resource.action
 */

export const PERMISSION_CATALOG = [
  // Contracts
  { key: "contracts.view", name: "View contracts", module: "contracts" },
  { key: "contracts.review", name: "Review contracts", module: "contracts" },
  { key: "contracts.promote", name: "Promote verified contracts", module: "contracts" },
  { key: "contracts.manage", name: "Manage contracts", module: "contracts" },
  // Rights
  { key: "rights.view", name: "View rights", module: "rights" },
  { key: "rights.review", name: "Review rights", module: "rights" },
  { key: "rights.manage", name: "Manage rights", module: "rights" },
  // Royalties
  { key: "royalties.view", name: "View royalty entitlements", module: "royalties" },
  { key: "royalties.review", name: "Review entitlements", module: "royalties" },
  { key: "royalties.manage", name: "Manage entitlements", module: "royalties" },
  // Platform events
  { key: "platform.events.view", name: "View platform events", module: "platform" },
  { key: "platform.events.replay", name: "Replay platform events", module: "platform" },
  // Users / org / security
  { key: "users.manage", name: "Manage users", module: "identity" },
  { key: "users.invite", name: "Invite users", module: "identity" },
  { key: "organizations.manage", name: "Manage organizations", module: "identity" },
  { key: "security.manage", name: "Manage security settings", module: "identity" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

/** System role templates (seed in A.6) */
export const SYSTEM_ROLE_TEMPLATES: Record<
  string,
  { name: string; permissions: PermissionKey[] }
> = {
  org_admin: {
    name: "Organization Admin",
    permissions: PERMISSION_CATALOG.map((p) => p.key),
  },
  member: {
    name: "Member",
    permissions: [
      "contracts.view",
      "contracts.review",
      "rights.view",
      "rights.review",
      "royalties.view",
      "royalties.review",
      "platform.events.view",
    ],
  },
  viewer: {
    name: "Viewer",
    permissions: [
      "contracts.view",
      "rights.view",
      "royalties.view",
      "platform.events.view",
    ],
  },
};

export function isKnownPermission(key: string): boolean {
  return PERMISSION_CATALOG.some((p) => p.key === key);
}
