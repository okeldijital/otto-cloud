/**
 * Event payload contracts — formal field schemas + validation (M4.2A).
 *
 * Design goals:
 * - Safe refactoring & backward-compatible evolution
 * - Reject invalid required fields / wrong types before persist
 * - Allow additionalProperties by default (forward-compatible)
 * - Inject envelope fields (organizationId) when declared
 *
 * Note: no import from ../types to avoid circular dependency.
 */

export type FieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "datetime"
  | "uuid"
  | "null";

export interface FieldSchema {
  /** Single type or union (e.g. ["string", "number"] for flexible IDs) */
  type: FieldType | FieldType[];
  required?: boolean;
  nullable?: boolean;
  description?: string;
  enum?: readonly (string | number | boolean)[];
}

export interface PayloadContract {
  /** Contract revision (semver, e.g. 1.0.0) */
  version: string;
  description?: string;
  fields: Record<string, FieldSchema>;
  /**
   * When true (default), unknown keys are allowed.
   * Set false for strict external-API style contracts later.
   */
  additionalProperties?: boolean;
  /** Auto-inject values from the publish envelope before validation */
  inject?: {
    organizationId?: boolean;
  };
}

export interface ValidationContext {
  organizationId: string;
  eventName: string;
  occurredAt?: Date;
  /** Optional default timestamps for event-specific enrichments */
  defaults?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** Payload after inject + normalize (only when valid, or best-effort) */
  payload: Record<string, unknown>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function typeList(t: FieldType | FieldType[]): FieldType[] {
  return Array.isArray(t) ? t : [t];
}

function isDatetime(value: unknown): boolean {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    return !Number.isNaN(t);
  }
  return false;
}

function matchesType(value: unknown, type: FieldType): boolean {
  switch (type) {
    case "null":
      return value === null;
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return (
        value !== null && typeof value === "object" && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "datetime":
      return isDatetime(value);
    case "uuid":
      return typeof value === "string" && UUID_RE.test(value);
    default:
      return false;
  }
}

/**
 * Enrich payload with injected envelope fields and optional defaults.
 */
export function enrichPayload(
  raw: Record<string, unknown>,
  contract: PayloadContract,
  ctx: ValidationContext
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...raw };

  if (contract.inject?.organizationId !== false) {
    // Default inject organizationId for all contracts unless explicitly disabled
    if (payload.organizationId == null) {
      payload.organizationId = ctx.organizationId;
    }
  }

  if (ctx.defaults) {
    for (const [k, v] of Object.entries(ctx.defaults)) {
      if (payload[k] === undefined) payload[k] = v;
    }
  }

  return payload;
}

/**
 * Validate payload against a formal contract.
 * Does not throw — returns errors list.
 */
export function validatePayload(
  raw: Record<string, unknown>,
  contract: PayloadContract,
  ctx: ValidationContext
): ValidationResult {
  const errors: string[] = [];
  const payload = enrichPayload(raw, contract, ctx);
  const allowExtra = contract.additionalProperties !== false;

  for (const [key, field] of Object.entries(contract.fields)) {
    const value = payload[key];
    const required = field.required === true;

    if (value === undefined) {
      if (required) {
        errors.push(`Missing required field: ${key}`);
      }
      continue;
    }

    if (value === null) {
      if (field.nullable || typeList(field.type).includes("null")) {
        continue;
      }
      errors.push(`Field ${key} cannot be null`);
      continue;
    }

    const types = typeList(field.type).filter((t) => t !== "null");
    const ok = types.some((t) => matchesType(value, t));
    if (!ok) {
      errors.push(
        `Field ${key} expected ${types.join(" | ")}, got ${describeValue(value)}`
      );
    }

    if (field.enum && !field.enum.includes(value as never)) {
      errors.push(
        `Field ${key} must be one of: ${field.enum.join(", ")}`
      );
    }
  }

  if (!allowExtra) {
    for (const key of Object.keys(payload)) {
      if (!(key in contract.fields)) {
        errors.push(`Unknown field not allowed: ${key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    payload,
  };
}

export class EventSchemaError extends Error {
  code = "EVENT_SCHEMA_INVALID" as const;
  status = 400;
  details: string[];
  eventName: string;
  contractVersion: string;

  constructor(
    eventName: string,
    contractVersion: string,
    details: string[]
  ) {
    super(
      `Event payload failed schema validation for ${eventName}@${contractVersion}`
    );
    this.name = "EventSchemaError";
    this.eventName = eventName;
    this.contractVersion = contractVersion;
    this.details = details;
  }
}

/**
 * Validate or throw EventSchemaError.
 * Returns the enriched/normalized payload.
 */
export function assertValidPayload(
  raw: Record<string, unknown>,
  contract: PayloadContract,
  ctx: ValidationContext
): Record<string, unknown> {
  const result = validatePayload(raw, contract, ctx);
  if (!result.valid) {
    throw new EventSchemaError(ctx.eventName, contract.version, result.errors);
  }
  return result.payload;
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Export a JSON-Schema-ish view for registry APIs / docs. */
export function contractToJsonSchema(contract: PayloadContract): object {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(contract.fields)) {
    const types = typeList(field.type);
    const jsonTypes = types.map((t) => {
      if (t === "integer") return "integer";
      if (t === "datetime" || t === "uuid") return "string";
      return t;
    });
    const prop: Record<string, unknown> = {
      type: jsonTypes.length === 1 ? jsonTypes[0] : jsonTypes,
      description: field.description,
    };
    if (field.enum) prop.enum = [...field.enum];
    if (types.includes("datetime")) prop.format = "date-time";
    if (types.includes("uuid")) prop.format = "uuid";
    if (field.nullable) {
      prop.nullable = true;
    }
    properties[key] = prop;
    if (field.required) required.push(key);
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: contract.additionalProperties !== false,
    properties,
    required,
    "x-contract-version": contract.version,
  };
}

/** Standard envelope shape for external consumers / AI agents. */
export function buildEventEnvelope(params: {
  event: string;
  version: string;
  organizationId: string;
  payload: Record<string, unknown>;
  id?: string;
  correlationId?: string | null;
  causationId?: string | null;
  occurredAt?: string;
  producer?: string;
}) {
  return {
    event: params.event,
    version: params.version,
    organizationId: params.organizationId,
    payload: params.payload,
    id: params.id,
    correlationId: params.correlationId ?? null,
    causationId: params.causationId ?? null,
    occurredAt: params.occurredAt,
    producer: params.producer,
  };
}
