/**
 * Platform Notification Framework (Milestone 4.2)
 * First consumer of the Platform Event Bus — not the owner of events.
 */

export {
  notificationService,
  NotificationService,
} from "./services/notification-service";
export {
  reminderService,
  ReminderService,
} from "./scheduler/reminder-service";
export {
  getPreferences,
  upsertPreferences,
  isNotificationEnabled,
} from "./preferences";
export {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  NOTIFICATION_DEFINITIONS,
  EVENT_TO_NOTIFICATION_TYPE,
  NotificationError,
} from "./types";
export { registerNotificationSubscriber } from "./events/subscriber";
export { registerReminderSubscriber } from "./events/reminder-subscriber";
