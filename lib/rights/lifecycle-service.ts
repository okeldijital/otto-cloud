import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  canTransitionRight,
  RIGHT_EVENTS,
  RIGHT_STATUS,
  RIGHT_TRANSITIONS,
  type RightStatus,
} from "./constants";
import { assertCanManageRights } from "./permissions";
import {
  appendRightHistory,
  appendRightTimeline,
  publishRightEvent,
} from "./events";

export class RightsLifecycleService {
  async transition(params: {
    ctx: OrganizationContext;
    organizationId: string;
    rightId: string;
    status: string;
    notes?: string;
  }) {
    assertCanManageRights(params.ctx);
    const right = await prisma.right.findFirst({
      where: { id: params.rightId, organizationId: params.organizationId },
    });
    if (!right) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }

    const from = right.status as RightStatus;
    const to = params.status as RightStatus;
    if (!Object.values(RIGHT_STATUS).includes(to as any)) {
      throw new IntelligenceError("Invalid status", 400, "INVALID_STATUS");
    }
    if (!canTransitionRight(from, to)) {
      throw new IntelligenceError(
        `Cannot transition from ${from} to ${to}`,
        400,
        "INVALID_TRANSITION",
        [`Allowed: ${(RIGHT_TRANSITIONS[from] || []).join(", ") || "none"}`]
      );
    }

    const updated = await prisma.right.update({
      where: { id: right.id },
      data: {
        previousStatus: from,
        status: to,
        statusChangedAt: new Date(),
        statusChangedBy: params.ctx.userId,
      },
    });

    await appendRightTimeline({
      organizationId: params.organizationId,
      rightId: right.id,
      entryType: "lifecycle",
      title: `Status → ${to}`,
      description: params.notes || `From ${from}`,
      actorUserId: params.ctx.userId,
      payload: { from, to },
    });
    await appendRightHistory({
      organizationId: params.organizationId,
      rightId: right.id,
      action: "status_changed",
      actorUserId: params.ctx.userId,
      payload: { from, to, notes: params.notes },
    });

    await publishRightEvent({
      organizationId: params.organizationId,
      rightId: right.id,
      eventType: RIGHT_EVENTS.Updated,
      payload: { from, to },
      userId: params.ctx.userId,
    });

    if (to === RIGHT_STATUS.active) {
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: right.id,
        eventType: RIGHT_EVENTS.Activated,
        payload: {},
        userId: params.ctx.userId,
      });
    }
    if (to === RIGHT_STATUS.expired) {
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: right.id,
        eventType: RIGHT_EVENTS.Expired,
        payload: {},
        userId: params.ctx.userId,
      });
    }
    if (to === RIGHT_STATUS.superseded) {
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: right.id,
        eventType: RIGHT_EVENTS.Superseded,
        payload: {},
        userId: params.ctx.userId,
      });
    }
    if (to === RIGHT_STATUS.terminated) {
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: right.id,
        eventType: RIGHT_EVENTS.Terminated,
        payload: {},
        userId: params.ctx.userId,
      });
    }

    return updated;
  }
}

export const rightsLifecycleService = new RightsLifecycleService();
