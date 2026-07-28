/**
 * Platform Event Bus — shared types (Milestone 4.2).
 */

export type EventStatus =
  | "pending"
  | "published"
  | "processing"
  | "delivered"
  | "partially_failed"
  | "failed"
  | "dead_letter";

export type DeliveryStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed"
  | "skipped"
  | "dead_letter";

export type IdempotencyStrategy =
  | "event_id"
  | "event_subscriber"
  | "payload_hash"
  | "none";

export type RetentionPolicy = "indefinite" | "90d" | "365d" | "7d";

export interface EventDefinition {
  name: string;
  version: string;
  producer: string;
  description: string;
  /** JSON-schema-like freeform description of expected payload keys */
  payloadSchema: Record<string, string>;
  consumers: string[];
  idempotencyStrategy: IdempotencyStrategy;
  retentionPolicy: RetentionPolicy;
}

export interface PublishEventInput {
  eventName: string;
  organizationId: string;
  payload: Record<string, unknown>;
  producer?: string;
  version?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
  correlationId?: string | null;
  causationId?: string | null;
  parentEventId?: string | null;
  actorUserId?: number | null;
  entityType?: string | null;
  entityId?: string | number | null;
  /** When true, persist only (no dispatch) — used by replay of store */
  skipDispatch?: boolean;
}

export interface PlatformEventRecord {
  id: string;
  eventName: string;
  version: string;
  producer: string;
  organizationId: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
  publishedAt: Date;
  status: EventStatus;
  retryCount: number;
  correlationId: string | null;
  causationId: string | null;
  parentEventId: string | null;
  processingHistory: ProcessingStep[];
  actorUserId: number | null;
  entityType: string | null;
  entityId: string | null;
}

export interface ProcessingStep {
  at: string;
  action: string;
  detail?: Record<string, unknown>;
}

export interface SubscriberContext {
  event: PlatformEventRecord;
  deliveryId: string;
  attempt: number;
}

export type SubscriberHandler = (ctx: SubscriberContext) => Promise<void>;

export interface SubscriberRegistration {
  id: string;
  /** Event names or patterns ending with * */
  events: string[];
  handler: SubscriberHandler;
  description?: string;
  /** Max delivery attempts before DLQ (default from retry policy) */
  maxRetries?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  /** Base delay ms for exponential backoff */
  baseDelayMs: number;
  maxDelayMs: number;
  /** Immediate first retry after failure */
  immediateFirstRetry: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  immediateFirstRetry: true,
};

export class PlatformEventError extends Error {
  status: number;
  code: string;
  details?: string[];

  constructor(
    message: string,
    status = 400,
    code = "PLATFORM_EVENT_ERROR",
    details?: string[]
  ) {
    super(message);
    this.name = "PlatformEventError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
