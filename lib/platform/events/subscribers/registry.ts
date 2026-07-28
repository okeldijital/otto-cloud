import type { SubscriberRegistration } from "../types";

const subscribers: SubscriberRegistration[] = [];

export function registerSubscriber(sub: SubscriberRegistration): void {
  if (subscribers.some((s) => s.id === sub.id)) {
    // Allow re-registration in hot reload
    const idx = subscribers.findIndex((s) => s.id === sub.id);
    subscribers[idx] = sub;
    return;
  }
  subscribers.push(sub);
}

export function unregisterSubscriber(id: string): boolean {
  const idx = subscribers.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  subscribers.splice(idx, 1);
  return true;
}

export function listSubscribers(): SubscriberRegistration[] {
  return [...subscribers];
}

export function matchSubscribers(eventName: string): SubscriberRegistration[] {
  return subscribers.filter((s) =>
    s.events.some((pattern) => matchPattern(pattern, eventName))
  );
}

function matchPattern(pattern: string, eventName: string): boolean {
  if (pattern === "*" || pattern === eventName) return true;
  if (pattern.endsWith("*")) {
    // "contracts.*" or "contracts.lifecycle.*"
    return eventName.startsWith(pattern.slice(0, -1));
  }
  return false;
}

/** Clear all (tests only) */
export function clearSubscribers(): void {
  subscribers.length = 0;
}
