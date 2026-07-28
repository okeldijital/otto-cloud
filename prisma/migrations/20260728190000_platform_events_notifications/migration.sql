-- Platform Event Bus & Notification Framework (Milestone 4.2)

CREATE TABLE "platform_events" (
    "id" UUID NOT NULL,
    "eventName" VARCHAR(128) NOT NULL,
    "version" VARCHAR(16) NOT NULL DEFAULT '1.0',
    "producer" VARCHAR(64) NOT NULL,
    "organizationId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "correlationId" UUID,
    "causationId" UUID,
    "parentEventId" UUID,
    "processingHistory" JSONB NOT NULL DEFAULT '[]',
    "actorUserId" INTEGER,
    "entityType" VARCHAR(64),
    "entityId" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_event_deliveries" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "subscriberId" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_event_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_dead_letters" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "deliveryId" UUID,
    "subscriberId" VARCHAR(128) NOT NULL,
    "failureReason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "failedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replayedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),
    "organizationId" UUID NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "platform_dead_letters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(500),
    "status" VARCHAR(32) NOT NULL DEFAULT 'unread',
    "sourceEventId" UUID,
    "payload" JSONB,
    "readAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "dismissedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_notification_preferences" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "notificationType" VARCHAR(128) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" VARCHAR(32) NOT NULL DEFAULT 'immediate',
    "channels" JSONB NOT NULL DEFAULT '{"in_app":true}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_notification_deliveries" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" VARCHAR(32) NOT NULL DEFAULT 'in_app',
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attemptedAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_notification_history" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "userId" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_notification_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_reminders" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" INTEGER,
    "entityType" VARCHAR(64),
    "entityId" VARCHAR(64),
    "type" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    "sourceEventId" UUID,
    "scheduleId" UUID,
    "payload" JSONB,
    "firedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_reminder_schedules" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "dateType" VARCHAR(64) NOT NULL,
    "offsetDays" INTEGER NOT NULL DEFAULT -30,
    "reminderType" VARCHAR(128) NOT NULL,
    "titleTemplate" VARCHAR(255),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastScheduledAt" TIMESTAMPTZ(6),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_reminder_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_platform_events_org_published" ON "platform_events"("organizationId", "publishedAt");
CREATE INDEX "ix_platform_events_name" ON "platform_events"("eventName");
CREATE INDEX "ix_platform_events_status" ON "platform_events"("status");
CREATE INDEX "ix_platform_events_correlation" ON "platform_events"("correlationId");
CREATE INDEX "ix_platform_events_producer" ON "platform_events"("producer");

CREATE UNIQUE INDEX "platform_event_deliveries_idempotencyKey_key" ON "platform_event_deliveries"("idempotencyKey");
CREATE INDEX "ix_platform_event_deliveries_event" ON "platform_event_deliveries"("eventId");
CREATE INDEX "ix_platform_event_deliveries_sub_status" ON "platform_event_deliveries"("subscriberId", "status");
CREATE INDEX "ix_platform_event_deliveries_retry" ON "platform_event_deliveries"("nextRetryAt");

CREATE INDEX "ix_platform_dlq_org_status" ON "platform_dead_letters"("organizationId", "status");
CREATE INDEX "ix_platform_dlq_event" ON "platform_dead_letters"("eventId");
CREATE INDEX "ix_platform_dlq_subscriber" ON "platform_dead_letters"("subscriberId");

CREATE INDEX "ix_platform_notifications_user_status" ON "platform_notifications"("organizationId", "userId", "status");
CREATE INDEX "ix_platform_notifications_user_created" ON "platform_notifications"("userId", "createdAt");
CREATE INDEX "ix_platform_notifications_source_event" ON "platform_notifications"("sourceEventId");
CREATE INDEX "ix_platform_notifications_type" ON "platform_notifications"("type");

CREATE UNIQUE INDEX "uq_platform_notif_pref" ON "platform_notification_preferences"("organizationId", "userId", "notificationType");
CREATE INDEX "ix_platform_notif_pref_user" ON "platform_notification_preferences"("userId");

CREATE INDEX "ix_platform_notif_delivery_notif" ON "platform_notification_deliveries"("notificationId");
CREATE INDEX "ix_platform_notif_history_notif" ON "platform_notification_history"("notificationId");

CREATE INDEX "ix_platform_reminders_org_due" ON "platform_reminders"("organizationId", "status", "dueAt");
CREATE INDEX "ix_platform_reminders_entity" ON "platform_reminders"("entityType", "entityId");
CREATE INDEX "ix_platform_reminders_type" ON "platform_reminders"("type");

CREATE INDEX "ix_platform_reminder_schedules_org" ON "platform_reminder_schedules"("organizationId", "enabled");
CREATE INDEX "ix_platform_reminder_schedules_entity" ON "platform_reminder_schedules"("entityType", "entityId");

ALTER TABLE "platform_event_deliveries"
  ADD CONSTRAINT "platform_event_deliveries_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "platform_events"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "platform_dead_letters"
  ADD CONSTRAINT "platform_dead_letters_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "platform_events"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "platform_notification_deliveries"
  ADD CONSTRAINT "platform_notification_deliveries_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "platform_notifications"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "platform_notification_history"
  ADD CONSTRAINT "platform_notification_history_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "platform_notifications"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
