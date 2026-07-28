/**
 * In-process counters + DB-backed aggregates for platform event monitoring.
 */

type CounterKey =
  | "published"
  | "delivered"
  | "subscriber_failures"
  | "retries"
  | "dead_letter"
  | "notifications_created"
  | "reminders_created"
  | "processing_ms_total"
  | "processing_count";

const counters: Record<CounterKey, number> = {
  published: 0,
  delivered: 0,
  subscriber_failures: 0,
  retries: 0,
  dead_letter: 0,
  notifications_created: 0,
  reminders_created: 0,
  processing_ms_total: 0,
  processing_count: 0,
};

export function incMetric(key: CounterKey, amount = 1): void {
  counters[key] = (counters[key] || 0) + amount;
}

export function recordProcessingTime(ms: number): void {
  counters.processing_ms_total += ms;
  counters.processing_count += 1;
}

export function getInMemoryMetrics() {
  const avg =
    counters.processing_count > 0
      ? counters.processing_ms_total / counters.processing_count
      : 0;
  return {
    eventsPublished: counters.published,
    eventsDelivered: counters.delivered,
    subscriberFailures: counters.subscriber_failures,
    retryCount: counters.retries,
    deadLetterCount: counters.dead_letter,
    notificationQueue: counters.notifications_created,
    reminderQueue: counters.reminders_created,
    avgProcessingTimeMs: Math.round(avg * 100) / 100,
    processUptimeCounters: { ...counters },
  };
}

export function resetInMemoryMetrics(): void {
  for (const k of Object.keys(counters) as CounterKey[]) {
    counters[k] = 0;
  }
}
