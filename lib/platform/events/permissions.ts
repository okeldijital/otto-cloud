import type { OrganizationContext } from "@/lib/auth/organization-context";
import { PlatformEventError } from "./types";

/** View platform events (org members). */
export function canViewPlatformEvents(ctx: OrganizationContext): boolean {
  return !!ctx.organizationId;
}

/** Replay / DLQ management — admin or super-admin only. */
export function canReplayPlatformEvents(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  return role === "admin" || role === "owner" || role === "org_admin";
}

export function assertCanReplay(ctx: OrganizationContext): void {
  if (!canReplayPlatformEvents(ctx)) {
    throw new PlatformEventError(
      "Only organization admins may replay platform events",
      403,
      "REPLAY_FORBIDDEN"
    );
  }
}
