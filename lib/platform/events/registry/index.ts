import {
  LEGACY_EVENT_MAP,
  PLATFORM_EVENT_DEFINITIONS,
} from "./definitions";
import type { EventDefinition } from "../types";
import { PlatformEventError } from "../types";
import { contractToJsonSchema } from "../contracts/schema";

const byName = new Map<string, EventDefinition>();
for (const def of PLATFORM_EVENT_DEFINITIONS) {
  byName.set(def.name, def);
}

export function listEventDefinitions(): EventDefinition[] {
  return [...PLATFORM_EVENT_DEFINITIONS];
}

/** Registry entries with JSON Schema view of payload contracts (API/docs). */
export function listEventDefinitionsWithSchemas() {
  return PLATFORM_EVENT_DEFINITIONS.map((def) => ({
    name: def.name,
    version: def.version,
    producer: def.producer,
    description: def.description,
    consumers: def.consumers,
    idempotencyStrategy: def.idempotencyStrategy,
    retentionPolicy: def.retentionPolicy,
    contract: def.contract,
    payloadJsonSchema: contractToJsonSchema(def.contract),
  }));
}

export function getEventDefinition(name: string): EventDefinition | undefined {
  return byName.get(name);
}

export function requireEventDefinition(name: string): EventDefinition {
  const def = byName.get(name);
  if (!def) {
    throw new PlatformEventError(
      `Event not registered: ${name}`,
      400,
      "EVENT_NOT_REGISTERED"
    );
  }
  return def;
}

export function isEventRegistered(name: string): boolean {
  return byName.has(name);
}

/** Resolve legacy PascalCase names to platform registry names. */
export function resolvePlatformEventName(nameOrLegacy: string): string {
  if (byName.has(nameOrLegacy)) return nameOrLegacy;
  return LEGACY_EVENT_MAP[nameOrLegacy] || nameOrLegacy;
}

export function registerEventDefinition(def: EventDefinition): void {
  if (byName.has(def.name)) {
    throw new PlatformEventError(
      `Event already registered: ${def.name}`,
      409,
      "EVENT_ALREADY_REGISTERED"
    );
  }
  PLATFORM_EVENT_DEFINITIONS.push(def);
  byName.set(def.name, def);
}

export { PLATFORM_EVENT_DEFINITIONS, LEGACY_EVENT_MAP };
