import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { NOTIFICATION_DEFINITIONS } from "../types";

export async function getPreferences(params: {
  organizationId: string;
  userId: number;
}) {
  const rows = await prisma.platformNotificationPreference.findMany({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
    },
  });

  const byType = new Map(rows.map((r) => [r.notificationType, r]));
  const types = Object.keys(NOTIFICATION_DEFINITIONS);

  return types.map((type) => {
    const row = byType.get(type);
    const def = NOTIFICATION_DEFINITIONS[type];
    return {
      notificationType: type,
      title: def?.title,
      enabled: row?.enabled ?? def?.defaultEnabled ?? true,
      frequency: row?.frequency ?? "immediate",
      channels: row?.channels ?? { in_app: true },
      id: row?.id ?? null,
    };
  });
}

export async function isNotificationEnabled(params: {
  organizationId: string;
  userId: number;
  notificationType: string;
}): Promise<boolean> {
  const row = await prisma.platformNotificationPreference.findUnique({
    where: {
      organizationId_userId_notificationType: {
        organizationId: params.organizationId,
        userId: params.userId,
        notificationType: params.notificationType,
      },
    },
  });
  if (!row) {
    return NOTIFICATION_DEFINITIONS[params.notificationType]?.defaultEnabled ?? true;
  }
  if (!row.enabled || row.frequency === "disabled") return false;
  return true;
}

export async function upsertPreferences(params: {
  organizationId: string;
  userId: number;
  preferences: Array<{
    notificationType: string;
    enabled?: boolean;
    frequency?: string;
    channels?: Record<string, boolean>;
  }>;
}) {
  const results = [];
  for (const p of params.preferences) {
    const row = await prisma.platformNotificationPreference.upsert({
      where: {
        organizationId_userId_notificationType: {
          organizationId: params.organizationId,
          userId: params.userId,
          notificationType: p.notificationType,
        },
      },
      create: {
        organizationId: params.organizationId,
        userId: params.userId,
        notificationType: p.notificationType,
        enabled: p.enabled ?? true,
        frequency: p.frequency ?? "immediate",
        channels: (p.channels ?? { in_app: true }) as object,
      },
      update: {
        ...(p.enabled !== undefined ? { enabled: p.enabled } : {}),
        ...(p.frequency !== undefined ? { frequency: p.frequency } : {}),
        ...(p.channels !== undefined ? { channels: p.channels as object } : {}),
      },
    });
    results.push(row);
  }

  await recordAudit({
    action: "platform.notification.preference_changed",
    entity_type: "notification_preference",
    entity_id: params.userId,
    changes: { count: results.length },
    user_id: params.userId,
    organization_id: params.organizationId,
  }).catch(() => undefined);

  return results;
}
