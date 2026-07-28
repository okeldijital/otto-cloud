/**
 * OTTO Platform Event Bus (Milestone 4.2)
 *
 * Modules publish events. Modules subscribe to events.
 * Modules never call each other's business logic directly.
 */

export * from "./types";
export {
  listEventDefinitions,
  getEventDefinition,
  requireEventDefinition,
  isEventRegistered,
  resolvePlatformEventName,
  registerEventDefinition,
  PLATFORM_EVENT_DEFINITIONS,
  LEGACY_EVENT_MAP,
} from "./registry";
export { eventDispatcher, EventDispatcher } from "./dispatcher";
export {
  listEvents,
  getEventById,
  persistEvent,
  toEventRecord,
} from "./store";
export {
  registerSubscriber,
  unregisterSubscriber,
  listSubscribers,
  matchSubscribers,
  clearSubscribers,
} from "./subscribers/registry";
export {
  listDeadLetters,
  getDeadLetter,
  enqueueDeadLetter,
  markDeadLetterReplayed,
} from "./dead-letter";
export {
  getInMemoryMetrics,
  incMetric,
  recordProcessingTime,
  resetInMemoryMetrics,
} from "./metrics";
export {
  computeNextRetryAt,
  shouldRetry,
  DEFAULT_RETRY_POLICY,
} from "./retry/policy";
export {
  canViewPlatformEvents,
  canReplayPlatformEvents,
  assertCanReplay,
} from "./permissions";

/** Bootstrap: register built-in subscribers (call once at app start / first publish). */
let bootstrapped = false;

export async function bootstrapPlatformEvents(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  // Dynamic import to avoid circular deps at module load
  const { registerNotificationSubscriber } = await import(
    "@/lib/platform/notifications/events/subscriber"
  );
  const { registerReminderSubscriber } = await import(
    "@/lib/platform/notifications/events/reminder-subscriber"
  );
  registerNotificationSubscriber();
  registerReminderSubscriber();
}
