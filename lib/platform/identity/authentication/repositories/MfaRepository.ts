/**
 * MfaRepository — MFA credential / challenge data access (A.4).
 */

import { prisma } from "@/lib/prisma";

export class MfaRepository {
  async findEnabledCredential(identityId: string) {
    return prisma.iamMfaCredential.findFirst({
      where: {
        identityId,
        enabledAt: { not: null },
        disabledAt: null,
      },
    });
  }

  async findPendingCredential(identityId: string) {
    return prisma.iamMfaCredential.findFirst({
      where: {
        identityId,
        enabledAt: null,
        disabledAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async clearPending(identityId: string) {
    return prisma.iamMfaCredential.deleteMany({
      where: { identityId, enabledAt: null },
    });
  }

  async createPending(params: {
    identityId: string;
    secretEncrypted: string;
    keyVersion: number;
    label?: string;
  }) {
    return prisma.iamMfaCredential.create({
      data: {
        identityId: params.identityId,
        type: "totp",
        secretEncrypted: params.secretEncrypted,
        keyVersion: params.keyVersion,
        label: params.label ?? "Authenticator",
      },
    });
  }

  async enableCredential(id: string) {
    return prisma.iamMfaCredential.update({
      where: { id },
      data: { enabledAt: new Date(), lastUsedAt: new Date() },
    });
  }

  async disableAll(identityId: string) {
    return prisma.iamMfaCredential.updateMany({
      where: { identityId, disabledAt: null },
      data: { disabledAt: new Date() },
    });
  }

  async touchCredential(id: string) {
    return prisma.iamMfaCredential.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async createChallenge(data: {
    identityId: string;
    challengeTokenHash: string;
    maxAttempts: number;
    rememberMe: boolean;
    organizationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
  }) {
    // Invalidate prior pending challenges
    await prisma.iamMfaChallenge.updateMany({
      where: { identityId: data.identityId, status: "pending" },
      data: { status: "expired" },
    });
    return prisma.iamMfaChallenge.create({
      data: {
        identityId: data.identityId,
        challengeTokenHash: data.challengeTokenHash,
        maxAttempts: data.maxAttempts,
        rememberMe: data.rememberMe,
        organizationId: data.organizationId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt,
        status: "pending",
      },
    });
  }

  async findChallengeByTokenHash(hash: string) {
    return prisma.iamMfaChallenge.findUnique({
      where: { challengeTokenHash: hash },
      include: { identity: true },
    });
  }

  async findChallengeById(id: string) {
    return prisma.iamMfaChallenge.findUnique({
      where: { id },
      include: { identity: true },
    });
  }

  async incrementAttempt(id: string) {
    return prisma.iamMfaChallenge.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
  }

  async completeChallenge(id: string) {
    return prisma.iamMfaChallenge.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  async failChallenge(id: string) {
    return prisma.iamMfaChallenge.update({
      where: { id },
      data: { status: "failed" },
    });
  }

  async expireChallenge(id: string) {
    return prisma.iamMfaChallenge.update({
      where: { id },
      data: { status: "expired" },
    });
  }

  async getOrgMfaPolicy(organizationId: string | null | undefined) {
    if (!organizationId) return null;
    return prisma.iamOrganization.findUnique({
      where: { id: organizationId },
      select: { id: true, mfaPolicy: true },
    });
  }

  async getMembershipRole(identityId: string, organizationId: string) {
    return prisma.iamOrganizationMembership.findUnique({
      where: {
        identityId_organizationId: { identityId, organizationId },
      },
      include: { role: true },
    });
  }
}

export const mfaRepository = new MfaRepository();
