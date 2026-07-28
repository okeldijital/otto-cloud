import { prisma } from "@/lib/prisma";

export async function enqueueDeadLetter(params: {
  eventId: string;
  deliveryId?: string | null;
  subscriberId: string;
  failureReason: string;
  retryCount: number;
  organizationId: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.platformDeadLetter.create({
    data: {
      eventId: params.eventId,
      deliveryId: params.deliveryId ?? null,
      subscriberId: params.subscriberId,
      failureReason: params.failureReason,
      retryCount: params.retryCount,
      organizationId: params.organizationId,
      status: "open",
      metadata: (params.metadata ?? {}) as object,
    },
  });
}

export async function listDeadLetters(params: {
  organizationId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = { organizationId: params.organizationId };
  if (params.status) where.status = params.status;
  const take = Math.min(params.limit ?? 50, 200);
  const skip = params.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.platformDeadLetter.findMany({
      where,
      orderBy: { failedAt: "desc" },
      take,
      skip,
      include: {
        event: {
          select: {
            id: true,
            eventName: true,
            payload: true,
            publishedAt: true,
            status: true,
          },
        },
      },
    }),
    prisma.platformDeadLetter.count({ where }),
  ]);

  return { items, total, limit: take, offset: skip };
}

export async function markDeadLetterReplayed(id: string) {
  return prisma.platformDeadLetter.update({
    where: { id },
    data: { status: "replayed", replayedAt: new Date() },
  });
}

export async function getDeadLetter(
  id: string,
  organizationId: string
) {
  return prisma.platformDeadLetter.findFirst({
    where: { id, organizationId },
    include: { event: true },
  });
}
