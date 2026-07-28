import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";

export class RightsTimelineService {
  async getTimeline(params: {
    organizationId: string;
    rightId: string;
    limit?: number;
  }) {
    const right = await prisma.right.findFirst({
      where: { id: params.rightId, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!right) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }

    const take = Math.min(params.limit ?? 100, 200);
    const [timeline, history] = await Promise.all([
      prisma.rightTimelineEntry.findMany({
        where: {
          organizationId: params.organizationId,
          rightId: params.rightId,
        },
        orderBy: { occurredAt: "desc" },
        take,
      }),
      prisma.rightHistory.findMany({
        where: {
          organizationId: params.organizationId,
          rightId: params.rightId,
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    const merged = [
      ...timeline.map((e) => ({
        id: e.id,
        source: "timeline" as const,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        actorUserId: e.actorUserId,
        payload: e.payload,
        occurredAt: e.occurredAt.toISOString(),
      })),
      ...history.map((h) => ({
        id: `h-${h.id}`,
        source: "history" as const,
        entryType: h.action,
        title: h.action,
        description: null as string | null,
        actorUserId: h.actorUserId,
        payload: h.payload,
        occurredAt: h.createdAt.toISOString(),
      })),
    ];

    merged.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    return merged.slice(0, take);
  }
}

export const rightsTimelineService = new RightsTimelineService();
