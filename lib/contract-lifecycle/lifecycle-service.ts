import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { verifiedContractService } from "@/lib/verified-contract";
import { assertContractReady, contractReadinessService } from "@/lib/contract-readiness";
import {
  canTransition,
  KEY_DATE_LABELS,
  KEY_DATE_TYPES,
  LIFECYCLE_EVENTS,
  LIFECYCLE_STATUS,
  LIFECYCLE_STATUS_LABELS,
  LIFECYCLE_TRANSITIONS,
  type LifecycleStatus,
  type KeyDateType,
  RENEWAL_STATUS,
} from "./constants";
import { assertCanManageLifecycle, canManageLifecycle } from "./permissions";
import { appendTimeline, publishLifecycleEvent } from "./events";

/**
 * ContractLifecycleService — deterministic status engine, key dates, renewals,
 * amendments, supersession, timeline. No AI.
 */
export class ContractLifecycleService {
  async getOrCreate(params: {
    organizationId: string;
    contractId: number;
    userId?: number;
  }) {
    let lc = await prisma.contractLifecycle.findUnique({
      where: { contractId: params.contractId },
      include: {
        keyDates: { orderBy: { dateValue: "asc" } },
        renewals: { orderBy: { createdAt: "desc" }, take: 20 },
        amendments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!lc) {
      // Seed from verified contract if present
      const verified = await verifiedContractService.getCurrent({
        organizationId: params.organizationId,
        contractId: params.contractId,
      });

      const initialStatus: LifecycleStatus = verified
        ? LIFECYCLE_STATUS.verified
        : LIFECYCLE_STATUS.draft;

      lc = await prisma.contractLifecycle.create({
        data: {
          organizationId: params.organizationId,
          contractId: params.contractId,
          verifiedContractId: verified?.id ?? null,
          status: initialStatus,
          statusChangedAt: new Date(),
          statusChangedBy: params.userId ?? null,
        },
        include: {
          keyDates: true,
          renewals: true,
          amendments: true,
        },
      });

      await appendTimeline({
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: "lifecycle",
        title: "Lifecycle record created",
        description: `Initial status: ${LIFECYCLE_STATUS_LABELS[initialStatus]}`,
        actorUserId: params.userId,
        payload: { status: initialStatus },
      });

      // Seed key dates from verified domain
      if (verified) {
        if (verified.effectiveDateText) {
          await this.upsertKeyDateFromText({
            lifecycleId: lc.id,
            organizationId: params.organizationId,
            contractId: params.contractId,
            dateType: "effective",
            text: verified.effectiveDateText,
            source: "verified_contract",
            sourceRef: verified.id,
            verificationState: "verified",
          });
        }
        if (verified.expirationDateText) {
          await this.upsertKeyDateFromText({
            lifecycleId: lc.id,
            organizationId: params.organizationId,
            contractId: params.contractId,
            dateType: "expiration",
            text: verified.expirationDateText,
            source: "verified_contract",
            sourceRef: verified.id,
            verificationState: "verified",
          });
        }
        lc = await prisma.contractLifecycle.findUniqueOrThrow({
          where: { id: lc.id },
          include: {
            keyDates: { orderBy: { dateValue: "asc" } },
            renewals: { orderBy: { createdAt: "desc" }, take: 20 },
            amendments: { orderBy: { createdAt: "desc" } },
          },
        });
      }
    }

    return this.toDto(lc, params.organizationId);
  }

  async update(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    status?: string;
    autoRenew?: boolean;
    renewalIntervalMonths?: number | null;
    noticePeriodDays?: number | null;
    renewalStatus?: string;
    notes?: string | null;
    keyDates?: Array<{
      dateType: string;
      dateValue: string;
      timezone?: string;
      notes?: string;
    }>;
    supersedesContractId?: number | null;
    supersessionReason?: string | null;
    supersessionDate?: string | null;
    markRenewed?: boolean;
  }) {
    assertCanManageLifecycle(params.ctx);
    const current = await this.ensureLifecycle(
      params.organizationId,
      params.contractId,
      params.ctx.userId
    );

    const activatingByStatus =
      params.status === LIFECYCLE_STATUS.active &&
      params.status !== current.status;
    const activatingByRenewal =
      !!params.markRenewed && current.status === LIFECYCLE_STATUS.pending_renewal;

    if (activatingByStatus || activatingByRenewal) {
      const readiness = await contractReadinessService.evaluate({
        organizationId: params.organizationId,
        contractId: params.contractId,
      });
      assertContractReady(readiness);
    }

    const updates: any = {};
    if (params.notes !== undefined) updates.notes = params.notes;
    if (params.autoRenew !== undefined) updates.autoRenew = params.autoRenew;
    if (params.renewalIntervalMonths !== undefined) {
      updates.renewalIntervalMonths = params.renewalIntervalMonths;
    }
    if (params.noticePeriodDays !== undefined) {
      updates.noticePeriodDays = params.noticePeriodDays;
    }
    if (params.renewalStatus !== undefined) {
      updates.renewalStatus = params.renewalStatus;
    }

    // Status transition
    if (params.status && params.status !== current.status) {
      const from = current.status as LifecycleStatus;
      const to = params.status as LifecycleStatus;
      if (!Object.values(LIFECYCLE_STATUS).includes(to)) {
        throw new IntelligenceError("Invalid lifecycle status", 400, "INVALID_STATUS");
      }
      if (!canTransition(from, to)) {
        throw new IntelligenceError(
          `Cannot transition from ${from} to ${to}`,
          400,
          "INVALID_TRANSITION",
          [`Allowed: ${LIFECYCLE_TRANSITIONS[from]?.join(", ") || "none"}`]
        );
      }
      updates.previousStatus = from;
      updates.status = to;
      updates.statusChangedAt = new Date();
      updates.statusChangedBy = params.ctx.userId;
    }

    // Supersession
    if (params.supersedesContractId != null) {
      updates.supersedesContractId = params.supersedesContractId;
      updates.supersessionReason = params.supersessionReason ?? null;
      updates.supersessionDate = params.supersessionDate
        ? new Date(params.supersessionDate)
        : new Date();
      if (!updates.status) {
        // When marking this as superseding another, optionally set other to superseded
      }
    }

    const lc = await prisma.contractLifecycle.update({
      where: { id: current.id },
      data: updates,
      include: {
        keyDates: { orderBy: { dateValue: "asc" } },
        renewals: { orderBy: { createdAt: "desc" }, take: 20 },
        amendments: { orderBy: { createdAt: "desc" } },
      },
    });

    // Key dates upsert
    if (params.keyDates?.length) {
      for (const kd of params.keyDates) {
        if (!(KEY_DATE_TYPES as readonly string[]).includes(kd.dateType)) {
          throw new IntelligenceError(
            `Invalid date type: ${kd.dateType}`,
            400,
            "INVALID_DATE_TYPE"
          );
        }
        await prisma.contractKeyDate.upsert({
          where: {
            lifecycleId_dateType: {
              lifecycleId: lc.id,
              dateType: kd.dateType,
            },
          },
          create: {
            lifecycleId: lc.id,
            organizationId: params.organizationId,
            contractId: params.contractId,
            dateType: kd.dateType,
            dateValue: new Date(kd.dateValue),
            timezone: kd.timezone || "UTC",
            verificationState: "manual",
            source: "manual",
            notes: kd.notes || null,
          },
          update: {
            dateValue: new Date(kd.dateValue),
            timezone: kd.timezone || "UTC",
            notes: kd.notes || null,
            source: "manual",
            verificationState: "manual",
          },
        });
      }
    }

    // Supersede other contract
    if (params.supersedesContractId != null) {
      const other = await prisma.contractLifecycle.findUnique({
        where: { contractId: params.supersedesContractId },
      });
      if (other && other.organizationId === params.organizationId) {
        if (
          other.status !== LIFECYCLE_STATUS.superseded &&
          canTransition(other.status as LifecycleStatus, LIFECYCLE_STATUS.superseded)
        ) {
          await prisma.contractLifecycle.update({
            where: { id: other.id },
            data: {
              previousStatus: other.status,
              status: LIFECYCLE_STATUS.superseded,
              statusChangedAt: new Date(),
              statusChangedBy: params.ctx.userId,
              supersededByContractId: params.contractId,
              supersessionReason: params.supersessionReason ?? null,
              supersessionDate: params.supersessionDate
                ? new Date(params.supersessionDate)
                : new Date(),
            },
          });
          await appendTimeline({
            organizationId: params.organizationId,
            contractId: params.supersedesContractId,
            entryType: "supersession",
            title: "Contract superseded",
            description: `Superseded by contract #${params.contractId}`,
            actorUserId: params.ctx.userId,
            payload: {
              supersededBy: params.contractId,
              reason: params.supersessionReason,
            },
          });
          await publishLifecycleEvent({
            organizationId: params.organizationId,
            contractId: params.supersedesContractId,
            eventType: LIFECYCLE_EVENTS.Superseded,
            payload: {
              supersededByContractId: params.contractId,
              reason: params.supersessionReason,
            },
            userId: params.ctx.userId,
          });
        }
      }

      await appendTimeline({
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: "supersession",
        title: "Supersedes another contract",
        description: `Supersedes contract #${params.supersedesContractId}`,
        actorUserId: params.ctx.userId,
        payload: { supersedesContractId: params.supersedesContractId },
      });
      await publishLifecycleEvent({
        organizationId: params.organizationId,
        contractId: params.contractId,
        eventType: LIFECYCLE_EVENTS.Superseded,
        payload: {
          supersedesContractId: params.supersedesContractId,
          direction: "supersedes",
        },
        userId: params.ctx.userId,
      });
    }

    // Status change events + timeline
    if (updates.status && updates.status !== current.status) {
      await appendTimeline({
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: "status_change",
        title: `Status → ${LIFECYCLE_STATUS_LABELS[updates.status as LifecycleStatus] || updates.status}`,
        description: `From ${current.status}`,
        actorUserId: params.ctx.userId,
        payload: { from: current.status, to: updates.status },
      });
      await publishLifecycleEvent({
        organizationId: params.organizationId,
        contractId: params.contractId,
        eventType: LIFECYCLE_EVENTS.StatusChanged,
        payload: { from: current.status, to: updates.status },
        userId: params.ctx.userId,
      });
      if (updates.status === LIFECYCLE_STATUS.active) {
        await publishLifecycleEvent({
          organizationId: params.organizationId,
          contractId: params.contractId,
          eventType: LIFECYCLE_EVENTS.Activated,
          payload: {},
          userId: params.ctx.userId,
        });
      }
      if (updates.status === LIFECYCLE_STATUS.expired) {
        await publishLifecycleEvent({
          organizationId: params.organizationId,
          contractId: params.contractId,
          eventType: LIFECYCLE_EVENTS.Expired,
          payload: {},
          userId: params.ctx.userId,
        });
      }
      if (updates.status === LIFECYCLE_STATUS.pending_renewal) {
        await publishLifecycleEvent({
          organizationId: params.organizationId,
          contractId: params.contractId,
          eventType: LIFECYCLE_EVENTS.RenewalDue,
          payload: {},
          userId: params.ctx.userId,
        });
      }
    }

    // Mark renewed (manual)
    if (params.markRenewed) {
      await prisma.contractRenewal.create({
        data: {
          lifecycleId: current.id,
          organizationId: params.organizationId,
          contractId: params.contractId,
          status: "completed",
          completedDate: new Date(),
          intervalMonths: lc.renewalIntervalMonths,
          noticeDays: lc.noticePeriodDays,
          createdBy: params.ctx.userId,
        },
      });
      await prisma.contractLifecycle.update({
        where: { id: current.id },
        data: {
          renewalStatus: RENEWAL_STATUS.completed,
          status:
            lc.status === LIFECYCLE_STATUS.pending_renewal
              ? LIFECYCLE_STATUS.active
              : lc.status,
          previousStatus:
            lc.status === LIFECYCLE_STATUS.pending_renewal
              ? lc.status
              : lc.previousStatus,
          statusChangedAt:
            lc.status === LIFECYCLE_STATUS.pending_renewal
              ? new Date()
              : lc.statusChangedAt,
        },
      });
      await appendTimeline({
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: "renewal",
        title: "Renewal completed",
        actorUserId: params.ctx.userId,
      });
      await publishLifecycleEvent({
        organizationId: params.organizationId,
        contractId: params.contractId,
        eventType: LIFECYCLE_EVENTS.Renewed,
        payload: {},
        userId: params.ctx.userId,
      });
    }

    return this.getOrCreate({
      organizationId: params.organizationId,
      contractId: params.contractId,
      userId: params.ctx.userId,
    });
  }

  async createAmendment(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    amendmentNumber: string;
    effectiveDate?: string | null;
    reason?: string | null;
    status?: string;
    linkedVerifiedVersionId?: string | null;
    linkedVerifiedVersion?: number | null;
  }) {
    assertCanManageLifecycle(params.ctx);
    const lc = await this.ensureLifecycle(
      params.organizationId,
      params.contractId,
      params.ctx.userId
    );

    if (!params.amendmentNumber?.trim()) {
      throw new IntelligenceError(
        "Amendment number is required",
        400,
        "AMENDMENT_NUMBER_REQUIRED"
      );
    }

    try {
      const amendment = await prisma.contractAmendment.create({
        data: {
          organizationId: params.organizationId,
          contractId: params.contractId,
          lifecycleId: lc.id,
          amendmentNumber: params.amendmentNumber.trim(),
          effectiveDate: params.effectiveDate
            ? new Date(params.effectiveDate)
            : null,
          reason: params.reason || null,
          status: params.status || "registered",
          linkedVerifiedVersionId: params.linkedVerifiedVersionId || null,
          linkedVerifiedVersion: params.linkedVerifiedVersion ?? null,
          createdBy: params.ctx.userId,
        },
      });

      await appendTimeline({
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: "amendment",
        title: `Amendment ${amendment.amendmentNumber} registered`,
        description: amendment.reason || undefined,
        actorUserId: params.ctx.userId,
        payload: { amendmentId: amendment.id },
      });

      await publishLifecycleEvent({
        organizationId: params.organizationId,
        contractId: params.contractId,
        eventType: LIFECYCLE_EVENTS.Amended,
        payload: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
        },
        userId: params.ctx.userId,
      });

      return this.toAmendmentDto(amendment);
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new IntelligenceError(
          "Amendment number already exists for this contract",
          409,
          "AMENDMENT_EXISTS"
        );
      }
      throw error;
    }
  }

  async getTimeline(params: {
    organizationId: string;
    contractId: number;
    limit?: number;
  }) {
    // Ensure lifecycle exists so timeline can accumulate
    await this.ensureLifecycle(params.organizationId, params.contractId);

    const entries = await prisma.contractTimelineEntry.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
      orderBy: { occurredAt: "desc" },
      take: params.limit ?? 100,
    });

    return entries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      title: e.title,
      description: e.description,
      actorUserId: e.actorUserId,
      payload: e.payload,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  async getDashboardSummary(params: { organizationId: string }) {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const lifecycles = await prisma.contractLifecycle.findMany({
      where: { organizationId: params.organizationId },
      include: {
        keyDates: true,
      },
    });

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(LIFECYCLE_STATUS)) byStatus[s] = 0;
    let expiringSoon = 0;
    let pendingRenewal = 0;
    let expired = 0;
    let recentlyVerified = 0;
    let recentlyAmended = 0;

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const lc of lifecycles) {
      byStatus[lc.status] = (byStatus[lc.status] || 0) + 1;
      if (lc.status === LIFECYCLE_STATUS.pending_renewal) pendingRenewal += 1;
      if (lc.status === LIFECYCLE_STATUS.expired) expired += 1;
      if (
        lc.status === LIFECYCLE_STATUS.verified &&
        lc.statusChangedAt &&
        lc.statusChangedAt >= weekAgo
      ) {
        recentlyVerified += 1;
      }

      const exp = lc.keyDates.find((d) => d.dateType === "expiration");
      const inactiveStatuses: LifecycleStatus[] = [
        LIFECYCLE_STATUS.terminated,
        LIFECYCLE_STATUS.archived,
        LIFECYCLE_STATUS.superseded,
      ];
      if (
        exp &&
        exp.dateValue >= now &&
        exp.dateValue <= in30 &&
        !inactiveStatuses.includes(lc.status as LifecycleStatus)
      ) {
        expiringSoon += 1;
      }
    }

    const amendments = await prisma.contractAmendment.count({
      where: {
        organizationId: params.organizationId,
        createdAt: { gte: weekAgo },
      },
    });
    recentlyAmended = amendments;

    return {
      byStatus,
      expiringSoon,
      pendingRenewal,
      expired,
      recentlyVerified,
      recentlyAmended,
      total: lifecycles.length,
    };
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private async ensureLifecycle(
    organizationId: string,
    contractId: number,
    userId?: number
  ) {
    const dto = await this.getOrCreate({ organizationId, contractId, userId });
    const lc = await prisma.contractLifecycle.findUniqueOrThrow({
      where: { contractId },
      include: {
        keyDates: true,
        renewals: true,
        amendments: true,
      },
    });
    return { ...lc, ...dto, id: lc.id, status: lc.status };
  }

  private async upsertKeyDateFromText(params: {
    lifecycleId: string;
    organizationId: string;
    contractId: number;
    dateType: KeyDateType;
    text: string;
    source: string;
    sourceRef?: string;
    verificationState: string;
  }) {
    const parsed = tryParseDate(params.text);
    if (!parsed) return;
    await prisma.contractKeyDate.upsert({
      where: {
        lifecycleId_dateType: {
          lifecycleId: params.lifecycleId,
          dateType: params.dateType,
        },
      },
      create: {
        lifecycleId: params.lifecycleId,
        organizationId: params.organizationId,
        contractId: params.contractId,
        dateType: params.dateType,
        dateValue: parsed,
        timezone: "UTC",
        verificationState: params.verificationState,
        source: params.source,
        sourceRef: params.sourceRef || null,
        notes: `Seeded from: ${params.text}`,
      },
      update: {},
    });
  }

  toDto(lc: any, organizationId?: string) {
    const upcoming = (lc.keyDates || [])
      .filter((d: any) => new Date(d.dateValue) >= startOfToday())
      .sort(
        (a: any, b: any) =>
          new Date(a.dateValue).getTime() - new Date(b.dateValue).getTime()
      );

    return {
      id: lc.id,
      organizationId: lc.organizationId || organizationId,
      contractId: lc.contractId,
      verifiedContractId: lc.verifiedContractId,
      status: lc.status,
      statusLabel: LIFECYCLE_STATUS_LABELS[lc.status as LifecycleStatus] || lc.status,
      previousStatus: lc.previousStatus,
      statusChangedAt: lc.statusChangedAt?.toISOString?.() ?? lc.statusChangedAt,
      statusChangedBy: lc.statusChangedBy,
      autoRenew: lc.autoRenew,
      renewalIntervalMonths: lc.renewalIntervalMonths,
      noticePeriodDays: lc.noticePeriodDays,
      renewalStatus: lc.renewalStatus,
      supersedesContractId: lc.supersedesContractId,
      supersededByContractId: lc.supersededByContractId,
      supersessionReason: lc.supersessionReason,
      supersessionDate: formatDateOnly(lc.supersessionDate),
      notes: lc.notes,
      allowedTransitions: LIFECYCLE_TRANSITIONS[lc.status as LifecycleStatus] || [],
      keyDates: (lc.keyDates || []).map((d: any) => ({
        id: d.id,
        dateType: d.dateType,
        dateTypeLabel: KEY_DATE_LABELS[d.dateType] || d.dateType,
        dateValue: formatDateOnly(d.dateValue),
        timezone: d.timezone,
        verificationState: d.verificationState,
        source: d.source,
        sourceRef: d.sourceRef,
        notes: d.notes,
      })),
      upcomingDates: upcoming.map((d: any) => ({
        dateType: d.dateType,
        dateTypeLabel: KEY_DATE_LABELS[d.dateType] || d.dateType,
        dateValue: formatDateOnly(d.dateValue),
      })),
      renewals: (lc.renewals || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        scheduledDate: formatDateOnly(r.scheduledDate),
        completedDate: formatDateOnly(r.completedDate),
        intervalMonths: r.intervalMonths,
        noticeDays: r.noticeDays,
        notes: r.notes,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      amendments: (lc.amendments || []).map((a: any) => this.toAmendmentDto(a)),
      createdAt: lc.createdAt?.toISOString?.() ?? lc.createdAt,
      updatedAt: lc.updatedAt?.toISOString?.() ?? lc.updatedAt,
    };
  }

  toAmendmentDto(a: any) {
    return {
      id: a.id,
      amendmentNumber: a.amendmentNumber,
      effectiveDate: formatDateOnly(a.effectiveDate),
      reason: a.reason,
      status: a.status,
      linkedVerifiedVersionId: a.linkedVerifiedVersionId,
      linkedVerifiedVersion: a.linkedVerifiedVersion,
      createdBy: a.createdBy,
      createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    };
  }
}

function formatDateOnly(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tryParseDate(text: string): Date | null {
  // Try ISO first
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) return new Date(iso);
  // Common formats
  const m = text.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})|([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/
  );
  if (m) {
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  return null;
}

export const contractLifecycleService = new ContractLifecycleService();
