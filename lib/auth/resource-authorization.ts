/**
 * A.8 Step 3 — Canonical resource authorization helpers.
 *
 * Pattern:
 *   requireOrganization() → resolve resource by id + server-side org scope → mutate
 *
 * Never trusts client-supplied organizationId / tenantId / ownership.
 * Cross-tenant access returns 404 (non-leaking). Unauthenticated → 401 via requireOrganization.
 */

import { prisma } from "@/lib/prisma";
import {
  OrganizationContext,
  OrganizationContextError,
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";

export class ResourceAuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ResourceAuthError";
    this.status = status;
    this.code = code;
  }
}

export function resourceAuthErrorResponse(err: unknown): {
  body: { error: string; code?: string };
  status: number;
} {
  if (err instanceof ResourceAuthError) {
    return { body: { error: err.message, code: err.code }, status: err.status };
  }
  return orgContextErrorResponse(err);
}

/** Authenticate + resolve active organization (fail closed). */
export async function requireOrgAuth(): Promise<OrganizationContext> {
  return requireOrganization();
}

/**
 * Integer organization_id for contracts/legacy INT tables.
 * Fail closed: refuse non-positive / NaN values (never invent scope from garbage).
 */
export function requireLegacyIntOrgId(ctx: OrganizationContext): number {
  const n = ctx.legacyIntOrgId;
  if (!Number.isFinite(n) || n <= 0) {
    throw new ResourceAuthError(
      "Organization integer scope is not available",
      403,
      "ORG_SCOPE_UNAVAILABLE"
    );
  }
  return n;
}

/**
 * Fail-closed conversion of a value that must be a positive integer id.
 * Never falls back to 1 / 0 / inventing scope.
 */
export function requirePositiveIntId(
  raw: unknown,
  label = "id"
): number {
  if (raw === undefined || raw === null || raw === "") {
    throw new ResourceAuthError(`Missing ${label}`, 400, "VALIDATION_ERROR");
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) {
      throw new ResourceAuthError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
    }
    return raw;
  }
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) {
    throw new ResourceAuthError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ResourceAuthError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
  }
  return n;
}

/**
 * Resolve positive actor user id from organization context / session.
 * Fail closed — never invent user id 1.
 */
export function requireActorUserId(ctx: OrganizationContext): number {
  const n = ctx.userId;
  if (!Number.isFinite(n) || n <= 0) {
    throw new ResourceAuthError(
      "Authenticated user id is not available",
      403,
      "USER_SCOPE_UNAVAILABLE"
    );
  }
  return n;
}

/**
 * Verify an upload target entity belongs to the caller's organization.
 * Returns non-leaking 404 for cross-org or missing entities.
 */
export async function requireUploadEntityInOrg(
  entityType: string,
  entityIdRaw: string,
  ctx: OrganizationContext
): Promise<{ entityType: string; entityId: string }> {
  const type = entityType.trim().toLowerCase();
  const idStr = entityIdRaw.trim();
  if (!type || !idStr) {
    throw new ResourceAuthError(
      "entityType and entityId are required",
      400,
      "VALIDATION_ERROR"
    );
  }

  if (type === "attachment" || type === "attachments") {
    const att = await prisma.attachment.findFirst({
      where: { id: idStr, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!att) notFound("Attachment");
    return { entityType: type, entityId: att.id };
  }

  // Soft-bound types: attachment row itself is org-scoped at create time.
  if (
    type === "misc" ||
    type === "general" ||
    type === "document" ||
    type === "documents" ||
    type === "office"
  ) {
    return { entityType: type, entityId: idStr };
  }

  // Numeric catalog / workspace entities
  let id: number;
  try {
    id = requirePositiveIntId(idStr, "entityId");
  } catch {
    notFound("Resource");
  }

  switch (type) {
    case "workspace":
    case "workspaces": {
      const ws = await prisma.workspaces.findFirst({
        where: {
          id,
          organization_id: ctx.organizationId,
          is_deleted: false,
        },
        select: { id: true },
      });
      if (!ws) notFound("Workspace");
      return { entityType: type, entityId: String(ws.id) };
    }
    case "artist":
    case "artists":
      await requireArtistInOrg(id, ctx);
      break;
    case "release":
    case "releases":
      await requireReleaseInOrg(id, ctx);
      break;
    case "work":
    case "works":
      await requireWorkInOrg(id, ctx);
      break;
    case "contract":
    case "contracts":
      await requireContractInOrg(id, ctx);
      break;
    case "track":
    case "tracks":
      await requireTrackInOrg(id, ctx);
      break;
    case "royalty":
    case "royalties":
      await requireRoyaltyInOrg(id, ctx);
      break;
    case "playlist":
    case "playlists":
      await requirePlaylistInOrg(id, ctx);
      break;
    default:
      // Unknown entity types: fail closed to avoid attaching to foreign ids
      throw new ResourceAuthError(
        "Unsupported entityType for upload",
        400,
        "VALIDATION_ERROR"
      );
  }

  return { entityType: type, entityId: String(id) };
}

export function notFound(entity = "Resource"): never {
  throw new ResourceAuthError(`${entity} not found`, 404, "NOT_FOUND");
}

// ── Catalog (UUID organization_id) ─────────────────────────────────────────

export async function requireArtistInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.artists.findFirst({
    where: { id, organization_id: ctx.organizationId },
  });
  if (!row) notFound("Artist");
  return row;
}

export async function requireReleaseInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.releases.findFirst({
    where: { id, organization_id: ctx.organizationId, is_deleted: false },
  });
  if (!row) notFound("Release");
  return row;
}

export async function requireWorkInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.works.findFirst({
    where: { id, organization_id: ctx.organizationId, is_deleted: false },
  });
  if (!row) notFound("Work");
  return row;
}

/** Contracts use INT organization_id (+ optional tenant_id UUID). */
export async function requireContractInOrg(id: number, ctx: OrganizationContext) {
  const intOrg = requireLegacyIntOrgId(ctx);
  const row = await prisma.contracts.findFirst({
    where: {
      id,
      OR: [
        { organization_id: intOrg },
        ...(ctx.organizationId
          ? [{ tenant_id: ctx.organizationId }]
          : []),
      ],
    },
  });
  if (!row) notFound("Contract");
  return row;
}

/**
 * R5 — Organization-scoped predicate for contracts list/count queries.
 * Contracts use INT organization_id (+ optional tenant_id UUID); mirrors the
 * ownership test in requireContractInOrg. Fail closed (403) when the legacy
 * INT org scope is unavailable; never derives scope from client input.
 */
export function contractOrgScopeWhere(
  ctx: OrganizationContext
): Record<string, unknown> {
  const intOrg = requireLegacyIntOrgId(ctx);
  return {
    OR: [
      { organization_id: intOrg },
      ...(ctx.organizationId ? [{ tenant_id: ctx.organizationId }] : []),
    ],
  };
}

/**
 * A.9 F2 — AI contract documents use INT organization_id (+ optional tenant_id UUID).
 * Organization-bound before any simulation/planning read; foreign rows 404 (non-leaking).
 */
export async function requireAIContractDocumentInOrg(
  id: number,
  ctx: OrganizationContext
) {
  const intOrg = requireLegacyIntOrgId(ctx);
  const row = await prisma.ai_contract_documents.findFirst({
    where: {
      id,
      OR: [
        { organization_id: intOrg },
        ...(ctx.organizationId
          ? [{ tenant_id: ctx.organizationId }]
          : []),
      ],
    },
  });
  if (!row) notFound("Contract document");
  return row;
}

/**
 * Tracks have no organization_id. Access only via:
 * - tenant_id matching org UUID
 * - primary release belonging to org
 * - work belonging to org
 * - secondary track_releases → release in org
 */
export function trackOrgScopeWhere(ctx: OrganizationContext): Record<string, unknown> {
  return {
    OR: [
      { tenant_id: ctx.organizationId },
      { releases: { is: { organization_id: ctx.organizationId, is_deleted: false } } },
      { works: { is: { organization_id: ctx.organizationId, is_deleted: false } } },
      {
        track_releases: {
          some: {
            releases: { organization_id: ctx.organizationId, is_deleted: false },
          },
        },
      },
    ],
  };
}

export async function requireTrackInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.tracks.findFirst({
    where: { id, ...(trackOrgScopeWhere(ctx) as object) },
  });
  if (!row) notFound("Track");
  return row;
}

/**
 * Royalties have no organization_id. Scope via tenant_id or linked artist/work/track ownership.
 */
export function royaltyOrgScopeWhere(ctx: OrganizationContext): Record<string, unknown> {
  return {
    OR: [
      { tenant_id: ctx.organizationId },
      { artists: { is: { organization_id: ctx.organizationId } } },
      { works: { is: { organization_id: ctx.organizationId, is_deleted: false } } },
      {
        tracks: {
          is: trackOrgScopeWhere(ctx),
        },
      },
    ],
  };
}

export async function requireRoyaltyInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.royalties.findFirst({
    where: { id, ...(royaltyOrgScopeWhere(ctx) as object) },
  });
  if (!row) notFound("Royalty");
  return row;
}

// ── Office (UUID organization_id) ──────────────────────────────────────────

export async function requireTaskInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.tasks.findFirst({
    where: { id, organization_id: ctx.organizationId, is_deleted: false },
  });
  if (!row) notFound("Task");
  return row;
}

export async function requireEventInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.events.findFirst({
    where: { id, organization_id: ctx.organizationId },
  });
  if (!row) notFound("Event");
  return row;
}

export async function requireDocumentInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.documents.findFirst({
    where: { id, organization_id: ctx.organizationId },
  });
  if (!row) notFound("Document");
  return row;
}

export async function requireStatusQuoInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.status_quo_items.findFirst({
    where: { id, organization_id: ctx.organizationId },
  });
  if (!row) notFound("Status quo item");
  return row;
}

export async function requireAuditLogInOrg(id: number, ctx: OrganizationContext) {
  // audit_logs.organization_id is Int
  const intOrg = requireLegacyIntOrgId(ctx);
  const row = await prisma.audit_logs.findFirst({
    where: {
      id,
      OR: [
        { organization_id: intOrg },
        ...(ctx.organizationId ? [{ tenant_id: ctx.organizationId }] : []),
      ],
    },
  });
  if (!row) notFound("Audit log");
  return row;
}

/**
 * Activities have no organization_id column. Scope via the authoritative
 * relationship activities.user_id → users.organization_id (server-derived).
 * Never trusts client-supplied organization_id/tenant_id.
 */
export function activityOrgScopeWhere(ctx: OrganizationContext): Record<string, unknown> {
  return { users: { is: { organization_id: ctx.organizationId } } };
}

export async function requireActivityInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.activities.findFirst({
    where: { id, ...(activityOrgScopeWhere(ctx) as object) },
  });
  if (!row) notFound("Activity");
  return row;
}

// ── Workspace children (UUID organization_id) ──────────────────────────────

async function requireWorkspaceChild<T extends { organization_id: string }>(
  entity: string,
  finder: () => Promise<T | null>
): Promise<T> {
  const row = await finder();
  if (!row) notFound(entity);
  return row;
}

export async function requireWorkspaceDeliverableInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Deliverable", () =>
    prisma.workspace_deliverables.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceMilestoneInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Milestone", () =>
    prisma.workspace_milestones.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceApprovalInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Approval", () =>
    prisma.workspace_approvals.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspacePublicationInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Publication", () =>
    prisma.workspace_publications.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceVideoInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Video", () =>
    prisma.workspace_videos.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceMarketingPhaseInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Marketing phase", () =>
    prisma.workspace_marketing_phases.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceMarketingTaskInOrg(
  id: number,
  ctx: OrganizationContext
) {
  return requireWorkspaceChild("Marketing task", () =>
    prisma.workspace_marketing_tasks.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  );
}

export async function requireWorkspaceInOrg(id: number, ctx: OrganizationContext) {
  const row = await prisma.workspaces.findFirst({
    where: { id, organization_id: ctx.organizationId },
  });
  if (!row) notFound("Workspace");
  return row;
}

/**
 * Playlists: no organization_id column.
 * Scoped by tenant_id (UUID org) when present, else created_by matching session user.
 * Fail closed if neither ownership signal matches.
 */
export async function requirePlaylistInOrg(
  id: number,
  ctx: OrganizationContext
) {
  const row = await prisma.playlists.findFirst({
    where: {
      id,
      OR: [
        { tenant_id: ctx.organizationId },
        ...(ctx.userId > 0
          ? [{ created_by: ctx.userId, tenant_id: null as string | null }]
          : []),
      ],
    },
  });
  if (!row) notFound("Playlist");
  return row;
}

export function playlistOrgScopeWhere(
  ctx: OrganizationContext
): Record<string, unknown> {
  return {
    OR: [
      { tenant_id: ctx.organizationId },
      ...(ctx.userId > 0
        ? [{ created_by: ctx.userId, tenant_id: null }]
        : []),
    ],
  };
}

/**
 * R5 — Validate a client-supplied entity reference before it is persisted to
 * an AI registry row (ai_contract_resolution_links / ai_core_write_proposal_items
 * / ai_release_integration_links). Reuses only the canonical require*InOrg
 * primitives — ownership is always established server-side from the org
 * context. Null/empty references are allowed (nullable columns); any non-null
 * reference must resolve to a positive integer owned by the caller's
 * organization (foreign/non-existent → 404 NOT_FOUND, non-leaking). Unknown
 * entity types fail closed (400) so a link can never reference an unverified
 * id.
 */
export async function requireEntityReferenceInOrg(
  entityTypeRaw: unknown,
  entityIdRaw: unknown,
  ctx: OrganizationContext
): Promise<number | null> {
  if (entityIdRaw === undefined || entityIdRaw === null || entityIdRaw === "") {
    return null;
  }
  const id = requirePositiveIntId(entityIdRaw, "entity_id");
  const type = String(entityTypeRaw ?? "")
    .trim()
    .toLowerCase();

  switch (type) {
    case "artist":
    case "artists":
      await requireArtistInOrg(id, ctx);
      break;
    case "release":
    case "releases":
      await requireReleaseInOrg(id, ctx);
      break;
    case "work":
    case "works":
      await requireWorkInOrg(id, ctx);
      break;
    case "contract":
    case "contracts":
      await requireContractInOrg(id, ctx);
      break;
    case "track":
    case "tracks":
      await requireTrackInOrg(id, ctx);
      break;
    case "royalty":
    case "royalties":
      await requireRoyaltyInOrg(id, ctx);
      break;
    case "playlist":
    case "playlists":
      await requirePlaylistInOrg(id, ctx);
      break;
    case "contract_document":
    case "contract_documents":
    case "ai_contract_document":
    case "ai_contract_documents":
      await requireAIContractDocumentInOrg(id, ctx);
      break;
    default:
      throw new ResourceAuthError(
        "Unsupported entity_type",
        400,
        "VALIDATION_ERROR"
      );
  }
  return id;
}

/**
 * Files: only via attachment id owned by organization (never raw storage path).
 */
export async function requireAttachmentInOrg(
  attachmentId: string,
  ctx: OrganizationContext
) {
  const row = await prisma.attachment.findFirst({
    where: { id: attachmentId, organizationId: ctx.organizationId },
  });
  if (!row) notFound("Attachment");
  return row;
}

export function isOrgContextError(
  err: unknown
): err is OrganizationContextError | ResourceAuthError {
  return (
    err instanceof OrganizationContextError || err instanceof ResourceAuthError
  );
}
