import { registerSubscriber } from "@/lib/platform/events/subscribers/registry";
import { reminderService } from "../scheduler/reminder-service";
import { logger } from "@/lib/logger";

/**
 * Schedules lifecycle reminders when contracts activate or dates change context.
 * Schedule only — no external delivery.
 */
export function registerReminderSubscriber(): void {
  registerSubscriber({
    id: "reminders.lifecycle_scheduler",
    description: "Schedule lifecycle date reminders from platform events",
    events: [
      "contracts.lifecycle.activated",
      "contracts.lifecycle.renewal_due",
      "contracts.lifecycle.status_changed",
    ],
    maxRetries: 3,
    handler: async ({ event }) => {
      const contractId = event.payload.contractId as number | undefined;
      if (contractId == null) return;

      // Key dates may be in payload; otherwise skip (API can schedule explicitly)
      const dates = (event.payload.keyDates as Array<{
        dateType: string;
        dateValue: string;
      }>) || [];

      if (!dates.length) return;

      try {
        await reminderService.scheduleLifecycleReminders({
          organizationId: event.organizationId,
          contractId,
          dates,
          createdBy: event.actorUserId,
          sourceEventId: event.id,
        });
      } catch (error) {
        logger.error("reminders.subscriber", "schedule failed", {
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  });
}
