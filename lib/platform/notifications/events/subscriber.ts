import { registerSubscriber } from "@/lib/platform/events/subscribers/registry";
import { notificationService } from "../services/notification-service";
import {
  EVENT_TO_NOTIFICATION_TYPE,
  NOTIFICATION_DEFINITIONS,
} from "../types";
import { logger } from "@/lib/logger";

/**
 * Notification framework as platform event subscriber.
 * Never modifies event history.
 */
export function registerNotificationSubscriber(): void {
  registerSubscriber({
    id: "notifications.in_app",
    description: "Create in-app notifications from platform events",
    events: [
      "contracts.lifecycle.*",
      "contracts.relationship.*",
      "contracts.verification.*",
      "contracts.verified.*",
      "reminders.fired",
    ],
    maxRetries: 5,
    handler: async ({ event }) => {
      const notifType = EVENT_TO_NOTIFICATION_TYPE[event.eventName];
      if (!notifType) {
        // Not every lifecycle event maps to a user notification
        return;
      }

      const def = NOTIFICATION_DEFINITIONS[notifType];
      const contractId =
        event.payload.contractId ??
        (event.entityType === "contract" ? event.entityId : null);

      const title = def?.title || event.eventName;
      let body = def?.body || null;
      if (contractId != null) {
        body = body
          ? `${body} (Contract #${contractId})`
          : `Contract #${contractId}`;
      }

      const link =
        contractId != null ? `/contracts/${contractId}` : null;

      try {
        await notificationService.notifyOrganization({
          organizationId: event.organizationId,
          type: notifType,
          title,
          body,
          link,
          sourceEventId: event.id,
          payload: {
            eventName: event.eventName,
            ...event.payload,
          },
          excludeUserId: event.actorUserId,
        });
      } catch (error) {
        logger.error("notifications.subscriber", "failed", {
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  });
}
