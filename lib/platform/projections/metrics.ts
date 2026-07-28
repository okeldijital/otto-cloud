/**
 * Projection metrics — in-process counters for monitoring.
 */

type CounterKey =
  | "events_applied"
  | "keys_projected"
  | "rebuilds"
  | "replays"
  | "failures"
  | "checkpoints_written"
  | "processing_ms_total"
  | "processing_count";

const counters: Record<CounterKey, number> = {
  events_applied: 0,
  keys_projected: 0,
  rebuilds: 0,
  replays: 0,
  failures: 0,
  checkpoints_written: 0,
  processing_ms_total: 0,
  processing_count: 0,
};

export function incProjectionMetric(key: CounterKey, amount = 1): void {
  counters[key] = (counters[key] || 0) + amount;
}

export function recordProjectionTime(ms: number): void {
  counters.processing_ms_total += ms;
  counters.processing_count += 1;
}

export function getProjectionMetrics() {
  const avg =
    counters.processing_count > 0
      ? counters.processing_ms_total / counters.processing_count
      : 0;
  return {
    eventsApplied: counters.events_applied,
    keysProjected: counters.keys_projected,
    rebuilds: counters.rebuilds,
    replays: counters.replays,
    failures: counters.failures,
    checkpointsWritten: counters.checkpoints_written,
    avgProcessingTimeMs: Math.round(avg * 100) / 100,
    processCounters: { ...counters },
  };
}

export function resetProjectionMetrics(): void {
  for (const k of Object.keys(counters) as CounterKey[]) {
    counters[k] = 0;
  }
}
