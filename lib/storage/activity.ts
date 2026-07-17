import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Storage activity logging.
 *
 * Every storage action (create / download / delete / update) must leave an
 * audit trail. We reuse the existing `recordAudit` helper (which writes to
 * the `audit_logs` table) so there is a single logging mechanism in Otto.
 *
 * In addition, a placeholder event is emitted for each `attachment.*` event
 * so future consumers (analytics, webhooks, real-time UI) can subscribe once
 * an event bus exists. The emitter is intentionally a no-op-friendly hook that
 * only logs today — it does not introduce a second logging system.
 */

export type AttachmentEvent =
  | "attachment.created"
  | "attachment.downloaded"
  | "attachment.deleted"
  | "attachment.updated";

interface EmitParams {
  event: AttachmentEvent;
  attachmentId: string;
  organizationId: string;
  userId: number;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Placeholder event emitter. Logs the event so behaviour is observable and
 * traceable. Replace the body with a real publish call (e.g. to a message
 * queue / event bus) when that infrastructure lands — callers do not change.
 */
export async function emitAttachmentEvent(params: EmitParams): Promise<void> {
  logger.info("storage.events", `Emitted ${params.event}`, {
    attachmentId: params.attachmentId,
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

/**
 * Record an `attachment.*` action to the audit log and emit the
 * corresponding placeholder event.
 */
export async function logAttachmentActivity(params: {
  event: AttachmentEvent;
  attachmentId: string;
  organizationId: string;
  userId: number;
  entityType?: string;
  entityId?: string;
  fileName?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const {
    event,
    attachmentId,
    organizationId,
    userId,
    entityType,
    entityId,
    fileName,
    ipAddress,
    userAgent,
  } = params;

  await recordAudit({
    action: event,
    entity_type: "attachment",
    entity_id: undefined,
    entity_name: fileName,
    user_id: userId,
    organization_id: organizationId,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  await emitAttachmentEvent({
    event,
    attachmentId,
    organizationId,
    userId,
    entityType,
    entityId,
  });
}
