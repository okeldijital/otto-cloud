/** Users / RBAC domain migrator — see registry + engine + table-config. */
export const MODULE = "users" as const;
export const TABLES = [
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "teams",
  "team_members",
] as const;
