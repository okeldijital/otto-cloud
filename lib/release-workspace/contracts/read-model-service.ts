/**
 * ReleaseContractReadModelService — read-only projection queries.
 */

import { prisma } from "@/lib/prisma";
import {
  aggregateReleaseHealth,
  type HealthResult,
} from "./health-service";
import { EXPIRING_SOON_DAYS, HEALTH_STATUS } from "./constants";
import { releaseContractSyncService } from "./sync-service";

export class ReleaseContractReadModelService {
  /**
   * List linked contract projections. Optionally rebuild if empty / force.
   */
  async listForRelease(params: {
    organizationId: string;
    releaseId: number;
    refresh?: boolean;
  }) {
    if (params.refresh) {
      await releaseContractSyncService.rebuildForRelease({
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      });
    }

    let rows = await prisma.releaseContractSummary.findMany({
      where: {
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      },
      orderBy: { contractTitle: "asc" },
    });

    // Lazy initial projection if none yet
    if (rows.length === 0) {
      const result = await releaseContractSyncService.rebuildForRelease({
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      });
      rows = result.summaries as any[];
    }

    return rows.map((r) => this.toDto(r));
  }

  async getSummary(params: {
    organizationId: string;
    releaseId: number;
    refresh?: boolean;
  }) {
    const contracts = await this.listForRelease(params);
    const health = this.computeAggregateHealth(contracts);
    const now = new Date();
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + EXPIRING_SOON_DAYS);

    const expiringSoon = contracts.filter((c) => {
      if (!c.expirationDate) return false;
      const d = new Date(c.expirationDate);
      return d >= now && d <= in90;
    });
    const pendingRenewal = contracts.filter(
      (c) => c.lifecycleStatus === "pending_renewal"
    );
    const expired = contracts.filter(
      (c) =>
        c.lifecycleStatus === "expired" ||
        c.healthStatus === HEALTH_STATUS.critical
    );
    const underReview = contracts.filter(
      (c) =>
        c.lifecycleStatus === "pending_verification" ||
        c.verificationStatus === "reopened"
    );
    const recentlyAmended = contracts.filter((c) => (c.amendmentCount || 0) > 0);

    const upcomingDates = contracts
      .flatMap((c) => {
        const dates: Array<{
          contractId: number;
          contractTitle: string | null;
          dateType: string;
          dateValue: string;
        }> = [];
        if (c.expirationDate)
          dates.push({
            contractId: c.contractId,
            contractTitle: c.contractTitle,
            dateType: "expiration",
            dateValue: c.expirationDate,
          });
        if (c.renewalDate)
          dates.push({
            contractId: c.contractId,
            contractTitle: c.contractTitle,
            dateType: "renewal",
            dateValue: c.renewalDate,
          });
        if (c.noticeDeadline)
          dates.push({
            contractId: c.contractId,
            contractTitle: c.contractTitle,
            dateType: "notice_deadline",
            dateValue: c.noticeDeadline,
          });
        return dates;
      })
      .filter((d) => new Date(d.dateValue) >= now)
      .sort(
        (a, b) =>
          new Date(a.dateValue).getTime() - new Date(b.dateValue).getTime()
      )
      .slice(0, 10);

    return {
      releaseId: params.releaseId,
      contractCount: contracts.length,
      health,
      counts: {
        linked: contracts.length,
        expiringSoon: expiringSoon.length,
        pendingRenewal: pendingRenewal.length,
        expired: expired.filter((c) => c.lifecycleStatus === "expired").length,
        underReview: underReview.length,
        recentlyAmended: recentlyAmended.length,
        healthy: contracts.filter((c) => c.healthStatus === "healthy").length,
        warning: contracts.filter((c) => c.healthStatus === "warning").length,
        critical: contracts.filter((c) => c.healthStatus === "critical")
          .length,
      },
      upcomingDates,
      contracts,
    };
  }

  async getHealth(params: {
    organizationId: string;
    releaseId: number;
    refresh?: boolean;
  }) {
    const contracts = await this.listForRelease(params);
    const health = this.computeAggregateHealth(contracts);
    return {
      releaseId: params.releaseId,
      ...health,
      contracts: contracts.map((c) => ({
        contractId: c.contractId,
        contractTitle: c.contractTitle,
        healthStatus: c.healthStatus,
        healthReasons: c.healthReasons,
        lifecycleStatus: c.lifecycleStatus,
      })),
    };
  }

  /**
   * Org-level dashboard cards for release workspace contract integration.
   */
  async getDashboard(params: { organizationId: string }) {
    const rows = await prisma.releaseContractSummary.findMany({
      where: { organizationId: params.organizationId },
    });
    const now = new Date();
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + EXPIRING_SOON_DAYS);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const releaseIds = new Set(rows.map((r) => r.releaseId));

    return {
      contractsLinked: rows.length,
      releasesWithContracts: releaseIds.size,
      contractsExpiring: rows.filter(
        (r) =>
          r.expirationDate &&
          r.expirationDate >= now &&
          r.expirationDate <= in90
      ).length,
      contractsNeedingRenewal: rows.filter(
        (r) => r.lifecycleStatus === "pending_renewal"
      ).length,
      contractsUnderReview: rows.filter(
        (r) => r.lifecycleStatus === "pending_verification"
      ).length,
      contractsRecentlyAmended: rows.filter(
        (r) => r.amendmentCount > 0 && r.projectedAt >= weekAgo
      ).length,
      verificationActivity: rows.filter(
        (r) => r.lastVerifiedAt && r.lastVerifiedAt >= weekAgo
      ).length,
      byHealth: {
        healthy: rows.filter((r) => r.healthStatus === "healthy").length,
        warning: rows.filter((r) => r.healthStatus === "warning").length,
        critical: rows.filter((r) => r.healthStatus === "critical").length,
      },
    };
  }

  /**
   * Search projections for release search integration.
   */
  async search(params: {
    organizationId: string;
    q: string;
    limit?: number;
  }) {
    const q = params.q.trim();
    if (!q) return [];
    const take = Math.min(params.limit ?? 20, 50);

    // JSON search is limited — use title / lifecycle / status text fields
    const rows = await prisma.releaseContractSummary.findMany({
      where: {
        organizationId: params.organizationId,
        OR: [
          { contractTitle: { contains: q, mode: "insensitive" } },
          { lifecycleStatus: { contains: q, mode: "insensitive" } },
          { verificationStatus: { contains: q, mode: "insensitive" } },
          { rightsSummary: { contains: q, mode: "insensitive" } },
          { relationshipType: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
    });

    // Party name search (in-memory on small set for party hits)
    const partyHits = await prisma.releaseContractSummary.findMany({
      where: { organizationId: params.organizationId },
      take: 200,
    });
    const partyMatches = partyHits.filter((r) => {
      const parties = Array.isArray(r.partiesJson) ? r.partiesJson : [];
      return parties.some(
        (p: any) =>
          typeof p?.name === "string" &&
          p.name.toLowerCase().includes(q.toLowerCase())
      );
    });

    const byKey = new Map<string, (typeof rows)[0]>();
    for (const r of [...rows, ...partyMatches]) {
      byKey.set(`${r.releaseId}:${r.contractId}`, r);
    }

    return Array.from(byKey.values())
      .slice(0, take)
      .map((r) => this.toDto(r));
  }

  private computeAggregateHealth(contracts: Array<{ healthStatus: string; healthReasons: any }>): HealthResult {
    return aggregateReleaseHealth(
      contracts.map((c) => ({
        status: c.healthStatus as any,
        reasons: Array.isArray(c.healthReasons) ? c.healthReasons : [],
      }))
    );
  }

  toDto(r: any) {
    return {
      id: r.id,
      organizationId: r.organizationId,
      releaseId: r.releaseId,
      contractId: r.contractId,
      relationshipId: r.relationshipId,
      relationshipType: r.relationshipType,
      contractTitle: r.contractTitle,
      verifiedContractId: r.verifiedContractId,
      verifiedVersion: r.verifiedVersion,
      verificationStatus: r.verificationStatus,
      lifecycleStatus: r.lifecycleStatus,
      contractStatus: r.contractStatus,
      effectiveDate: formatDate(r.effectiveDate),
      expirationDate: formatDate(r.expirationDate),
      renewalDate: formatDate(r.renewalDate),
      noticeDeadline: formatDate(r.noticeDeadline),
      lastVerifiedAt: r.lastVerifiedAt?.toISOString?.() ?? r.lastVerifiedAt,
      parties: Array.isArray(r.partiesJson) ? r.partiesJson : [],
      territories: Array.isArray(r.territoriesJson) ? r.territoriesJson : [],
      rightsSummary: r.rightsSummary,
      relationshipCount: r.relationshipCount,
      amendmentCount: r.amendmentCount,
      healthStatus: r.healthStatus,
      healthReasons: Array.isArray(r.healthReasons) ? r.healthReasons : [],
      projectedAt: r.projectedAt?.toISOString?.() ?? r.projectedAt,
      contractCenterUrl: `/contracts/${r.contractId}`,
    };
  }
}

function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export const releaseContractReadModelService =
  new ReleaseContractReadModelService();
