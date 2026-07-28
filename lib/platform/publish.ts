/**
 * Shared helper for domain modules to publish onto the platform event bus.
 * Ensures bootstrap of subscribers and non-blocking publishSafe.
 */

import {
  bootstrapPlatformEvents,
  eventDispatcher,
  resolvePlatformEventName,
  type PublishEventInput,
} from "@/lib/platform/events";

export async function publishPlatformEvent(
  input: PublishEventInput & { eventName: string }
) {
  await bootstrapPlatformEvents();
  const eventName = resolvePlatformEventName(input.eventName);
  return eventDispatcher.publishSafe({
    ...input,
    eventName,
  });
}
