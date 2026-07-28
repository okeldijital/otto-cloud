import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { isNotificationEnabled } from "../preferences";
import {
  NOTIFICATION_DEFINITIONS,
  NOTIFICATION_STATUS,
  NotificationError,
} from "../types";
import { incMetric } from "@/lib/platform/events/metrics";

/**
 * In-app notification service — first platform event consumer channel.
 * No email / SMS / push.
 */
export class NotificationService {
  async create(params: {
    organizationId: string;
    userId: number;
    type: string;
    title?: string;
    body?: string | null;
    link?: string | null;
    sourceEventId?: string | null;
    payload?: Record<string, unknown>;
    skipPreferenceCheck?: boolean;
  }) {
    if (!params.skipPreferenceCheck) {
      const enabled = await isNotificationEnabled({
        organizationId: params.organizationId,
        userId: params.userId,
        notificationType: params.type,
      });
      if (!enabled) return null;
    }

    const def = NOTIFICATION_DEFINITIONS[params.type];
    const title = params.title || def?.title || params.type;
    const body = params.body ?? def?.body ?? null;

    const notification = await prisma.platformNotification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title,
        body,
        link: params.link ?? null,
        status: NOTIFICATION_STATUS.unread,
        sourceEventId: params.sourceEventId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });

    await prisma.platformNotificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: "in_app",
        status: "delivered",
        attemptedAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    await prisma.platformNotificationHistory.create({
      data: {
        notificationId: notification.id,
        action: "created",
        userId: params.userId,
        payload: { type: params.type } as object,
      },
    });

    incMetric("notifications_created");
    return notification;
  }

  /**
   * Fan-out notification to org members (or a specific user).
   */
  async notifyOrganization(params: {
    organizationId: string;
    type: string;
    title?: string;
    body?: string | null;
    link?: string | null;
    sourceEventId?: string | null;
    payload?: Record<string, unknown>;
    /** If set, only this user */
    userId?: number | null;
    /** Exclude actor from notifications */
    excludeUserId?: number | null;
  }) {
    let userIds: number[] = [];
    if (params.userId != null) {
      userIds = [params.userId];
    } else {
      const members = await prisma.tenant_users.findMany({
        where: { tenant_id: params.organizationId },
        select: { user_id: true },
        take: 200,
      });
      userIds = members
        .map((m) => m.user_id)
        .filter((id): id is number => id != null);
    }

    if (params.excludeUserId != null) {
      userIds = userIds.filter((id) => id !== params.excludeUserId);
    }

    const created = [];
    for (const userId of userIds) {
      try {
        const n = await this.create({
          organizationId: params.organizationId,
          userId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
          sourceEventId: params.sourceEventId,
          payload: params.payload,
        });
        if (n) created.push(n);
      } catch (error) {
        logger.error("platform.notifications", "create failed", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return created;
  }

  async list(params: {
    organizationId: string;
    userId: number;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      organizationId: params.organizationId,
      userId: params.userId,
    };
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const take = Math.min(params.limit ?? 50, 100);
    const skip = params.offset ?? 0;

    const [items, total, unreadCount] = await Promise.all([
      prisma.platformNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.platformNotification.count({ where }),
      prisma.platformNotification.count({
        where: {
          organizationId: params.organizationId,
          userId: params.userId,
          status: NOTIFICATION_STATUS.unread,
        },
      }),
    ]);

    return { items, total, unreadCount, limit: take, offset: skip };
  }

  async updateStatus(params: {
    organizationId: string;
    userId: number;
    notificationId: string;
    status: string;
  }) {
    const n = await prisma.platformNotification.findFirst({
      where: {
        id: params.notificationId,
        organizationId: params.organizationId,
        userId: params.userId,
      },
    });
    if (!n) {
      throw new NotificationError("Notification not found", 404, "NOT_FOUND");
    }

    const allowed = ["unread", "read", "archived", "dismissed"];
    if (!allowed.includes(params.status)) {
      throw new NotificationError("Invalid status", 400, "INVALID_STATUS");
    }

    const data: any = { status: params.status };
    if (params.status === "read") data.readAt = new Date();
    if (params.status === "archived") data.archivedAt = new Date();
    if (params.status === "dismissed") data.dismissedAt = new Date();

    const updated = await prisma.platformNotification.update({
      where: { id: n.id },
      data,
    });

    await prisma.platformNotificationHistory.create({
      data: {
        notificationId: n.id,
        action: params.status,
        userId: params.userId,
      },
    });

    await recordAudit({
      action: "platform.notification.read",
      entity_type: "platform_notification",
      entity_name: n.id,
      changes: { status: params.status },
      user_id: params.userId,
      organization_id: params.organizationId,
    }).catch(() => undefined);

    return updated;
  }

  async markAllRead(params: {
    organizationId: string;
    userId: number;
  }) {
    await prisma.platformNotification.updateMany({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        status: NOTIFICATION_STATUS.unread,
      },
      data: {
        status: NOTIFICATION_STATUS.read,
        readAt: new Date(),
      },
    });
  }
}

export const notificationService = new NotificationService();
