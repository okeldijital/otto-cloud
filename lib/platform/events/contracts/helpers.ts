import type { FieldSchema, PayloadContract } from "./schema";

/** Shorthand field builders for registry definitions. */
export const f = {
  string: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "string",
    ...opts,
  }),
  number: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "number",
    ...opts,
  }),
  integer: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "integer",
    ...opts,
  }),
  boolean: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "boolean",
    ...opts,
  }),
  uuid: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "uuid",
    ...opts,
  }),
  datetime: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "datetime",
    ...opts,
  }),
  object: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "object",
    ...opts,
  }),
  array: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: "array",
    ...opts,
  }),
  /** Accept number or string IDs (legacy / external) */
  id: (opts?: Partial<FieldSchema>): FieldSchema => ({
    type: ["number", "string"],
    ...opts,
  }),
};

export function required(field: FieldSchema): FieldSchema {
  return { ...field, required: true };
}

export function optional(field: FieldSchema): FieldSchema {
  return { ...field, required: false };
}

export function nullable(field: FieldSchema): FieldSchema {
  return { ...field, nullable: true };
}

/** Common org + contract identity block. */
export function withOrgContract(
  extra: Record<string, FieldSchema> = {}
): Record<string, FieldSchema> {
  return {
    organizationId: required(
      f.uuid({ description: "Tenant organization UUID" })
    ),
    contractId: required(
      f.number({ description: "Legacy integer contract id" })
    ),
    ...extra,
  };
}

export function contract(
  version: string,
  fields: Record<string, FieldSchema>,
  opts?: Partial<Omit<PayloadContract, "version" | "fields">>
): PayloadContract {
  return {
    version,
    fields,
    additionalProperties: true,
    inject: { organizationId: true },
    ...opts,
  };
}
