/**
 * Canonical permission catalog & system role templates (A.5).
 * Format: resource.action — no generic "admin" key.
 */

export const PERMISSION_CATALOG = [
  // Contracts
  { key: "contracts.view", name: "View contracts", module: "contracts" },
  { key: "contracts.create", name: "Create contracts", module: "contracts" },
  { key: "contracts.edit", name: "Edit contracts", module: "contracts" },
  { key: "contracts.review", name: "Review contracts", module: "contracts" },
  { key: "contracts.promote", name: "Promote verified contracts", module: "contracts" },
  { key: "contracts.delete", name: "Delete contracts", module: "contracts" },
  { key: "contracts.manage", name: "Manage contracts", module: "contracts" },
  // Rights
  { key: "rights.view", name: "View rights", module: "rights" },
  { key: "rights.create", name: "Create rights", module: "rights" },
  { key: "rights.edit", name: "Edit rights", module: "rights" },
  { key: "rights.review", name: "Review rights", module: "rights" },
  { key: "rights.promote", name: "Promote rights", module: "rights" },
  { key: "rights.delete", name: "Delete rights", module: "rights" },
  { key: "rights.manage", name: "Manage rights", module: "rights" },
  // Royalties
  { key: "royalties.view", name: "View royalty entitlements", module: "royalties" },
  { key: "royalties.manage", name: "Manage entitlements", module: "royalties" },
  { key: "royalties.review", name: "Review entitlements", module: "royalties" },
  { key: "royalties.export", name: "Export royalty data", module: "royalties" },
  // Release workspace
  { key: "workspace.view", name: "View release workspaces", module: "workspace" },
  { key: "workspace.edit", name: "Edit release workspaces", module: "workspace" },
  { key: "workspace.manage", name: "Manage release workspaces", module: "workspace" },
  { key: "workspace.approve", name: "Approve workspace items", module: "workspace" },
  // Documents
  { key: "documents.view", name: "View documents", module: "documents" },
  { key: "documents.upload", name: "Upload documents", module: "documents" },
  { key: "documents.download", name: "Download documents", module: "documents" },
  { key: "documents.delete", name: "Delete documents", module: "documents" },
  // AI
  { key: "ai.chat", name: "Use AI chat", module: "ai" },
  { key: "ai.generate", name: "Generate with AI", module: "ai" },
  { key: "ai.analyze", name: "Analyze with AI", module: "ai" },
  { key: "ai.admin", name: "Administer AI settings", module: "ai" },
  // Platform / administration
  { key: "platform.events.view", name: "View platform events", module: "platform" },
  { key: "platform.events.replay", name: "Replay platform events", module: "platform" },
  { key: "platform.admin", name: "Platform administration", module: "platform" },
  { key: "events.view", name: "View events", module: "platform" },
  { key: "events.replay", name: "Replay events", module: "platform" },
  { key: "notifications.manage", name: "Manage notifications", module: "platform" },
  { key: "audit.view", name: "View audit logs", module: "platform" },
  { key: "users.manage", name: "Manage users", module: "identity" },
  { key: "users.invite", name: "Invite users", module: "identity" },
  { key: "organizations.manage", name: "Manage organizations", module: "identity" },
  { key: "roles.manage", name: "Manage roles", module: "identity" },
  { key: "permissions.manage", name: "Manage permissions", module: "identity" },
  { key: "security.manage", name: "Manage security settings", module: "identity" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

const ALL = PERMISSION_CATALOG.map((p) => p.key) as PermissionKey[];

/**
 * Organization-scoped full access — everything except platform.admin.
 * Platform administration must not be implied by org ownership (A.8 A8-016).
 */
const ORG_OWNER = ALL.filter((k) => k !== "platform.admin") as PermissionKey[];

const VIEW = [
  "contracts.view",
  "rights.view",
  "royalties.view",
  "workspace.view",
  "documents.view",
  "platform.events.view",
  "events.view",
] as PermissionKey[];

const REVIEW = [
  ...VIEW,
  "contracts.review",
  "rights.review",
  "royalties.review",
  "documents.download",
  "ai.analyze",
] as PermissionKey[];

const EDIT = [
  ...REVIEW,
  "contracts.create",
  "contracts.edit",
  "rights.create",
  "rights.edit",
  "workspace.edit",
  "documents.upload",
  "documents.download",
  "ai.chat",
  "ai.generate",
] as PermissionKey[];

const MANAGE = [
  ...EDIT,
  "contracts.promote",
  "contracts.delete",
  "contracts.manage",
  "rights.promote",
  "rights.delete",
  "rights.manage",
  "royalties.manage",
  "royalties.export",
  "workspace.manage",
  "workspace.approve",
  "documents.delete",
  "users.invite",
] as PermissionKey[];

const ADMIN = [
  ...MANAGE,
  "users.manage",
  "organizations.manage",
  "roles.manage",
  "permissions.manage",
  "security.manage",
  "notifications.manage",
  "platform.events.replay",
  "events.replay",
  "audit.view",
  "ai.admin",
] as PermissionKey[];

/** System role templates seeded per organization */
export const SYSTEM_ROLE_TEMPLATES: Record<
  string,
  { name: string; permissions: PermissionKey[] }
> = {
  owner: {
    name: "Owner",
    // Org owner ≠ platform administrator (A8-016)
    permissions: ORG_OWNER,
  },
  administrator: {
    name: "Administrator",
    permissions: ADMIN,
  },
  /** Alias for administrator (legacy key) */
  org_admin: {
    name: "Organization Admin",
    permissions: ADMIN,
  },
  manager: {
    name: "Manager",
    permissions: MANAGE,
  },
  editor: {
    name: "Editor",
    permissions: EDIT,
  },
  reviewer: {
    name: "Reviewer",
    permissions: REVIEW,
  },
  contributor: {
    name: "Contributor",
    permissions: [
      ...VIEW,
      "contracts.create",
      "contracts.edit",
      "rights.create",
      "rights.edit",
      "workspace.edit",
      "documents.upload",
      "documents.download",
      "ai.chat",
      "ai.generate",
    ] as PermissionKey[],
  },
  member: {
    name: "Member",
    permissions: EDIT,
  },
  viewer: {
    name: "Viewer",
    permissions: VIEW,
  },
};

/** Catalog version — bump when catalog shape changes (cache invalidation) */
export const PERMISSION_CATALOG_VERSION = 6;

export function isKnownPermission(key: string): boolean {
  return PERMISSION_CATALOG.some((p) => p.key === key);
}
