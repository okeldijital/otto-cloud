import { DEFAULT_RETRY_POLICY, type RetryPolicy } from "../types";

export function computeNextRetryAt(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Date {
  if (policy.immediateFirstRetry && attempt <= 1) {
    return new Date();
  }
  const exp = Math.max(0, attempt - (policy.immediateFirstRetry ? 1 : 0));
  const delay = Math.min(
    policy.baseDelayMs * Math.pow(2, exp),
    policy.maxDelayMs
  );
  // Jitter ±20%
  const jitter = delay * (0.8 + Math.random() * 0.4);
  return new Date(Date.now() + jitter);
}

export function shouldRetry(
  attempts: number,
  maxRetries: number = DEFAULT_RETRY_POLICY.maxRetries
): boolean {
  return attempts < maxRetries;
}

export { DEFAULT_RETRY_POLICY };
