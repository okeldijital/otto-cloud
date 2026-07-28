import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import {
  appendProcessingStep,
  getEventById,
  listEvents,
  persistEvent,
  toEventRecord,
} from "../store";
import { matchSubscribers } from "../subscribers/registry";
import { enqueueDeadLetter } from "../dead-letter";
import {
  computeNextRetryAt,
  DEFAULT_RETRY_POLICY,
  shouldRetry,
} from "../retry/policy";
import { incMetric, recordProcessingTime } from "../metrics";
import { resolvePlatformEventName, requireEventDefinition } from "../registry";
import type {
  PlatformEventRecord,
  PublishEventInput,
  SubscriberRegistration,
} from "../types";
import { PlatformEventError } from "../types";

/**
 * Platform Event Dispatcher — publish, persist, dispatch, retry.
 * No business logic.
 */
export class EventDispatcher {
  async publish(input: PublishEventInput): Promise<PlatformEventRecord> {
    const eventName = resolvePlatformEventName(input.eventName);
    requireEventDefinition(eventName);

    const started = Date.now();
    const event = await persistEvent({ ...input, eventName });
    incMetric("published");

    if (input.actorUserId != null) {
      await recordAudit({
        action: "platform.event.published",
        entity_type: "platform_event",
        entity_name: event.id,
        changes: {
          eventName: event.eventName,
          producer: event.producer,
          correlationId: event.correlationId,
        },
        user_id: input.actorUserId,
        organization_id: input.organizationId,
      }).catch(() => undefined);
    }

    if (!input.skipDispatch) {
      await this.dispatch(event);
    } else {
      await appendProcessingStep(event.id, {
        at: new Date().toISOString(),
        action: "dispatch_skipped",
      }, "published");
    }

    recordProcessingTime(Date.now() - started);
    const latest = await getEventById(event.id);
    return latest || event;
  }

  /**
   * Publish using a known platform name or legacy PascalCase name.
   * Swallows errors so module producers stay non-blocking.
   */
  async publishSafe(
    input: PublishEventInput
  ): Promise<PlatformEventRecord | null> {
    try {
      return await this.publish(input);
    } catch (error) {
      logger.error("platform.events", "publish failed", {
        eventName: input.eventName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async dispatch(event: PlatformEventRecord): Promise<void> {
    await appendProcessingStep(
      event.id,
      { at: new Date().toISOString(), action: "dispatch_started" },
      "processing"
    );

    const subs = matchSubscribers(event.eventName);
    if (subs.length === 0) {
      await appendProcessingStep(
        event.id,
        {
          at: new Date().toISOString(),
          action: "no_subscribers",
        },
        "delivered"
      );
      incMetric("delivered");
      return;
    }

    let failures = 0;
    let successes = 0;

    for (const sub of subs) {
      const ok = await this.deliverToSubscriber(event, sub);
      if (ok) successes += 1;
      else failures += 1;
    }

    let status: PlatformEventRecord["status"] = "delivered";
    if (failures > 0 && successes === 0) status = "failed";
    else if (failures > 0) status = "partially_failed";
    else {
      incMetric("delivered");
    }

    await appendProcessingStep(
      event.id,
      {
        at: new Date().toISOString(),
        action: "dispatch_finished",
        detail: { successes, failures },
      },
      status
    );
  }

  private async deliverToSubscriber(
    event: PlatformEventRecord,
    sub: SubscriberRegistration,
    opts?: { force?: boolean }
  ): Promise<boolean> {
    const idempotencyKey = `${event.id}:${sub.id}`;
    let delivery = await prisma.platformEventDelivery.findUnique({
      where: { idempotencyKey },
    });

    if (delivery?.status === "delivered" && !opts?.force) {
      return true; // idempotent skip
    }

    if (!delivery) {
      delivery = await prisma.platformEventDelivery.create({
        data: {
          eventId: event.id,
          subscriberId: sub.id,
          status: "pending",
          attempts: 0,
          idempotencyKey,
        },
      });
    }

    const maxRetries = sub.maxRetries ?? DEFAULT_RETRY_POLICY.maxRetries;
    const attempt = delivery.attempts + 1;

    await prisma.platformEventDelivery.update({
      where: { id: delivery.id },
      data: { status: "processing", attempts: attempt },
    });

    try {
      await sub.handler({
        event,
        deliveryId: delivery.id,
        attempt,
      });

      await prisma.platformEventDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "delivered",
          deliveredAt: new Date(),
          lastError: null,
          nextRetryAt: null,
        },
      });

      await appendProcessingStep(event.id, {
        at: new Date().toISOString(),
        action: "subscriber_delivered",
        detail: { subscriberId: sub.id, attempt },
      });

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      incMetric("subscriber_failures");
      logger.error("platform.events.subscriber", "delivery failed", {
        subscriberId: sub.id,
        eventId: event.id,
        attempt,
        error: message,
      });

      if (shouldRetry(attempt, maxRetries)) {
        incMetric("retries");
        const nextRetryAt = computeNextRetryAt(attempt);
        await prisma.platformEventDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "failed",
            lastError: message,
            nextRetryAt,
          },
        });
        await appendProcessingStep(
          event.id,
          {
            at: new Date().toISOString(),
            action: "subscriber_retry_scheduled",
            detail: {
              subscriberId: sub.id,
              attempt,
              nextRetryAt: nextRetryAt.toISOString(),
              error: message,
            },
          },
          undefined,
          { retryCount: attempt }
        );
        return false;
      }

      // Permanent failure → DLQ
      await prisma.platformEventDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "dead_letter",
          lastError: message,
          nextRetryAt: null,
        },
      });

      await enqueueDeadLetter({
        eventId: event.id,
        deliveryId: delivery.id,
        subscriberId: sub.id,
        failureReason: message,
        retryCount: attempt,
        organizationId: event.organizationId,
      });
      incMetric("dead_letter");

      await appendProcessingStep(
        event.id,
        {
          at: new Date().toISOString(),
          action: "subscriber_dead_letter",
          detail: { subscriberId: sub.id, error: message },
        },
        "dead_letter",
        { retryCount: attempt }
      );

      if (event.actorUserId != null) {
        await recordAudit({
          action: "platform.event.subscriber_failure",
          entity_type: "platform_event",
          entity_name: event.id,
          changes: { subscriberId: sub.id, error: message },
          user_id: event.actorUserId,
          organization_id: event.organizationId,
        }).catch(() => undefined);
      }

      return false;
    }
  }

  /** Process deliveries due for retry. */
  async processRetries(limit = 50): Promise<number> {
    const due = await prisma.platformEventDelivery.findMany({
      where: {
        status: "failed",
        nextRetryAt: { lte: new Date() },
      },
      take: limit,
      orderBy: { nextRetryAt: "asc" },
      include: { event: true },
    });

    let processed = 0;
    for (const d of due) {
      const event = toEventRecord(d.event);
      const subs = matchSubscribers(event.eventName).filter(
        (s) => s.id === d.subscriberId
      );
      if (subs.length === 0) continue;
      await this.deliverToSubscriber(event, subs[0]);
      processed += 1;
    }
    return processed;
  }

  /**
   * Replay: re-dispatch an existing event (or DLQ) with idempotent deliveries.
   * Creates a new platform event of type platform.events.replayed for audit,
   * and re-runs subscribers on the original event (force re-delivery).
   */
  async replay(params: {
    organizationId: string;
    eventId?: string;
    deadLetterId?: string;
    correlationId?: string;
    from?: Date;
    to?: Date;
    actorUserId: number;
  }): Promise<{ replayed: number; eventIds: string[] }> {
    const eventIds: string[] = [];

    if (params.deadLetterId) {
      const dlq = await prisma.platformDeadLetter.findFirst({
        where: {
          id: params.deadLetterId,
          organizationId: params.organizationId,
        },
      });
      if (!dlq) {
        throw new PlatformEventError("Dead letter not found", 404, "DLQ_NOT_FOUND");
      }
      eventIds.push(dlq.eventId);
      await prisma.platformDeadLetter.update({
        where: { id: dlq.id },
        data: { status: "replayed", replayedAt: new Date() },
      });
    } else if (params.eventId) {
      const ev = await getEventById(params.eventId, params.organizationId);
      if (!ev) {
        throw new PlatformEventError("Event not found", 404, "EVENT_NOT_FOUND");
      }
      eventIds.push(ev.id);
    } else if (params.correlationId || params.from || params.to) {
      const listed = await listEvents({
        organizationId: params.organizationId,
        correlationId: params.correlationId,
        from: params.from,
        to: params.to,
        limit: 100,
      });
      eventIds.push(...listed.items.map((i) => i.id));
    } else {
      throw new PlatformEventError(
        "Provide eventId, deadLetterId, correlationId, or date range",
        400,
        "REPLAY_PARAMS_REQUIRED"
      );
    }

    for (const id of eventIds) {
      const event = await getEventById(id, params.organizationId);
      if (!event) continue;

      // Reset failed/dead_letter deliveries for re-attempt
      await prisma.platformEventDelivery.updateMany({
        where: {
          eventId: id,
          status: { in: ["failed", "dead_letter"] },
        },
        data: {
          status: "pending",
          nextRetryAt: null,
          lastError: null,
        },
      });

      const subs = matchSubscribers(event.eventName);
      for (const sub of subs) {
        await this.deliverToSubscriber(event, sub, { force: true });
      }

      await appendProcessingStep(event.id, {
        at: new Date().toISOString(),
        action: "replayed",
        detail: { actorUserId: params.actorUserId },
      });

      await this.publishSafe({
        eventName: "platform.events.replayed",
        organizationId: params.organizationId,
        producer: "platform",
        actorUserId: params.actorUserId,
        payload: { originalEventId: id },
        causationId: id,
        correlationId: event.correlationId,
        skipDispatch: true,
      });

      await recordAudit({
        action: "platform.event.replay",
        entity_type: "platform_event",
        entity_name: id,
        changes: { eventName: event.eventName },
        user_id: params.actorUserId,
        organization_id: params.organizationId,
      }).catch(() => undefined);
    }

    return { replayed: eventIds.length, eventIds };
  }
}

export const eventDispatcher = new EventDispatcher();
