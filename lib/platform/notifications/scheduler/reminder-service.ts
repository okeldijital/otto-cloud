import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { NotificationError } from "../types";
import { incMetric } from "@/lib/platform/events/metrics";
import { notificationService } from "../services/notification-service";
import { NOTIFICATION_TYPES } from "../types";

/**
 * Reminder scheduler — schedule only; no external delivery.
 * When fired, creates an in-app notification.
 */
export class ReminderService {
  async create(params: {
    organizationId: string;
    userId?: number | null;
    entityType?: string | null;
    entityId?: string | number | null;
    type: string;
    title: string;
    body?: string | null;
    dueAt: Date | string;
    sourceEventId?: string | null;
    scheduleId?: string | null;
    payload?: Record<string, unknown>;
    createdBy?: number | null;
  }) {
    const dueAt =
      typeof params.dueAt === "string" ? new Date(params.dueAt) : params.dueAt;
    if (Number.isNaN(dueAt.getTime())) {
      throw new NotificationError("Invalid dueAt", 400, "INVALID_DUE_AT");
    }

    const reminder = await prisma.platformReminder.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        entityType: params.entityType ?? null,
        entityId:
          params.entityId != null ? String(params.entityId) : null,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        dueAt,
        status: "scheduled",
        sourceEventId: params.sourceEventId ?? null,
        scheduleId: params.scheduleId ?? null,
        payload: (params.payload ?? {}) as object,
        createdBy: params.createdBy ?? null,
      },
    });

    incMetric("reminders_created");

    if (params.createdBy != null) {
      await recordAudit({
        action: "platform.reminder.created",
        entity_type: "platform_reminder",
        entity_name: reminder.id,
        changes: { type: params.type, dueAt: dueAt.toISOString() },
        user_id: params.createdBy,
        organization_id: params.organizationId,
      }).catch(() => undefined);
    }

    return reminder;
  }

  async list(params: {
    organizationId: string;
    status?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { organizationId: params.organizationId };
    if (params.status) where.status = params.status;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;

    const take = Math.min(params.limit ?? 50, 100);
    const skip = params.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.platformReminder.findMany({
        where,
        orderBy: { dueAt: "asc" },
        take,
        skip,
      }),
      prisma.platformReminder.count({ where }),
    ]);

    return { items, total, limit: take, offset: skip };
  }

  async update(params: {
    organizationId: string;
    reminderId: string;
    userId: number;
    status?: string;
    dueAt?: string | Date | null;
    title?: string;
    body?: string | null;
  }) {
    const r = await prisma.platformReminder.findFirst({
      where: { id: params.reminderId, organizationId: params.organizationId },
    });
    if (!r) {
      throw new NotificationError("Reminder not found", 404, "NOT_FOUND");
    }

    const data: any = {};
    if (params.title !== undefined) data.title = params.title;
    if (params.body !== undefined) data.body = params.body;
    if (params.dueAt !== undefined && params.dueAt !== null) {
      data.dueAt =
        typeof params.dueAt === "string"
          ? new Date(params.dueAt)
          : params.dueAt;
    }
    if (params.status) {
      const allowed = [
        "scheduled",
        "fired",
        "cancelled",
        "snoozed",
        "completed",
      ];
      if (!allowed.includes(params.status)) {
        throw new NotificationError("Invalid status", 400, "INVALID_STATUS");
      }
      data.status = params.status;
      if (params.status === "cancelled") data.cancelledAt = new Date();
      if (params.status === "fired") data.firedAt = new Date();
    }

    const updated = await prisma.platformReminder.update({
      where: { id: r.id },
      data,
    });

    await recordAudit({
      action: "platform.reminder.updated",
      entity_type: "platform_reminder",
      entity_name: r.id,
      changes: data,
      user_id: params.userId,
      organization_id: params.organizationId,
    }).catch(() => undefined);

    return updated;
  }

  /**
   * Fire due scheduled reminders → in-app notifications.
   * Call from cron / processReminders API later; available for tests.
   */
  async processDue(limit = 50): Promise<number> {
    const now = new Date();
    const due = await prisma.platformReminder.findMany({
      where: {
        status: "scheduled",
        dueAt: { lte: now },
      },
      take: limit,
      orderBy: { dueAt: "asc" },
    });

    let fired = 0;
    for (const r of due) {
      await prisma.platformReminder.update({
        where: { id: r.id },
        data: { status: "fired", firedAt: now },
      });

      if (r.userId != null) {
        await notificationService.create({
          organizationId: r.organizationId,
          userId: r.userId,
          type: NOTIFICATION_TYPES.reminderFired,
          title: r.title,
          body: r.body,
          sourceEventId: r.sourceEventId,
          payload: {
            reminderId: r.id,
            reminderType: r.type,
            entityType: r.entityType,
            entityId: r.entityId,
          },
        });
      } else {
        await notificationService.notifyOrganization({
          organizationId: r.organizationId,
          type: NOTIFICATION_TYPES.reminderFired,
          title: r.title,
          body: r.body,
          sourceEventId: r.sourceEventId,
          payload: {
            reminderId: r.id,
            reminderType: r.type,
            entityType: r.entityType,
            entityId: r.entityId,
          },
        });
      }
      fired += 1;
    }
    return fired;
  }

  /**
   * Schedule standard lifecycle reminders for a contract (expiration, renewal, notice).
   * Does not deliver — only creates PlatformReminder rows.
   */
  async scheduleLifecycleReminders(params: {
    organizationId: string;
    contractId: number;
    dates: Array<{ dateType: string; dateValue: Date | string }>;
    createdBy?: number | null;
    sourceEventId?: string | null;
  }) {
    const created = [];
    const offsets: Record<string, { days: number; type: string; title: string }> =
      {
        expiration: {
          days: -30,
          type: "contracts.lifecycle.expiration",
          title: "Contract expiration in 30 days",
        },
        renewal: {
          days: -30,
          type: "contracts.lifecycle.renewal",
          title: "Contract renewal date in 30 days",
        },
        notice_deadline: {
          days: -7,
          type: "contracts.lifecycle.notice",
          title: "Notice deadline in 7 days",
        },
        review: {
          days: -14,
          type: "contracts.lifecycle.review",
          title: "Contract review in 14 days",
        },
      };

    for (const d of params.dates) {
      const cfg = offsets[d.dateType];
      if (!cfg) continue;
      const base =
        typeof d.dateValue === "string"
          ? new Date(d.dateValue)
          : d.dateValue;
      if (Number.isNaN(base.getTime())) continue;

      const dueAt = new Date(base);
      dueAt.setDate(dueAt.getDate() + cfg.days);
      if (dueAt < new Date()) continue; // past — skip

      // Avoid duplicate scheduled reminders for same contract+type+day
      const dayStart = new Date(dueAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dueAt);
      dayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.platformReminder.findFirst({
        where: {
          organizationId: params.organizationId,
          entityType: "contract",
          entityId: String(params.contractId),
          type: cfg.type,
          status: "scheduled",
          dueAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (existing) continue;

      const r = await this.create({
        organizationId: params.organizationId,
        entityType: "contract",
        entityId: params.contractId,
        type: cfg.type,
        title: cfg.title,
        body: `Contract #${params.contractId}`,
        dueAt,
        sourceEventId: params.sourceEventId,
        createdBy: params.createdBy,
        payload: {
          contractId: params.contractId,
          dateType: d.dateType,
          dateValue: base.toISOString().slice(0, 10),
        },
      });
      created.push(r);
    }
    return created;
  }
}

export const reminderService = new ReminderService();
