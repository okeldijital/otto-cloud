/**
 * PasswordRepository — sole data access for password credentials (A.2).
 */

import { prisma } from "@/lib/prisma";

export class PasswordRepository {
  async findCredentialByIdentity(identityId: string) {
    return prisma.iamPasswordCredential.findUnique({
      where: { identityId },
    });
  }

  async findIdentityWithCredential(identityId: string) {
    return prisma.iamIdentity.findUnique({
      where: { id: identityId },
      include: { passwordCreds: true },
    });
  }

  async findIdentityByEmailNormalized(emailNormalized: string) {
    return prisma.iamIdentity.findUnique({
      where: { emailNormalized },
      include: { passwordCreds: true },
    });
  }

  async updatePasswordHash(params: {
    credentialId: string;
    passwordHash: string;
  }) {
    return prisma.iamPasswordCredential.update({
      where: { id: params.credentialId },
      data: {
        passwordHash: params.passwordHash,
        passwordChangedAt: new Date(),
        algorithm: "argon2id",
      },
    });
  }

  async createPasswordCredential(params: {
    identityId: string;
    passwordHash: string;
  }) {
    return prisma.iamPasswordCredential.create({
      data: {
        identityId: params.identityId,
        passwordHash: params.passwordHash,
        algorithm: "argon2id",
        passwordChangedAt: new Date(),
      },
    });
  }

  async addHistory(params: {
    identityId: string;
    credentialId?: string | null;
    passwordHash: string;
  }) {
    return prisma.iamPasswordHistory.create({
      data: {
        identityId: params.identityId,
        credentialId: params.credentialId ?? null,
        passwordHash: params.passwordHash,
      },
    });
  }

  async listHistory(identityId: string, take: number) {
    return prisma.iamPasswordHistory.findMany({
      where: { identityId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async trimHistory(identityId: string, keep: number) {
    const rows = await prisma.iamPasswordHistory.findMany({
      where: { identityId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (rows.length <= keep) return;
    const drop = rows.slice(keep).map((r) => r.id);
    await prisma.iamPasswordHistory.deleteMany({
      where: { id: { in: drop } },
    });
  }

  async incrementSessionVersion(
    identityId: string,
    options?: { clearMustChangePassword?: boolean }
  ): Promise<number> {
    const updated = await prisma.iamIdentity.update({
      where: { id: identityId },
      data: {
        sessionVersion: { increment: 1 },
        ...(options?.clearMustChangePassword
          ? {
              mustChangePassword: false,
              mustChangePasswordReason: null,
            }
          : {}),
      },
      select: { sessionVersion: true },
    });
    return updated.sessionVersion;
  }

  async setMustChangePassword(params: {
    identityId: string;
    reason?: string | null;
  }) {
    return prisma.iamIdentity.update({
      where: { id: params.identityId },
      data: {
        mustChangePassword: true,
        mustChangePasswordReason: params.reason ?? "admin_force_reset",
      },
    });
  }

  async clearMustChangePassword(identityId: string) {
    return prisma.iamIdentity.update({
      where: { id: identityId },
      data: {
        mustChangePassword: false,
        mustChangePasswordReason: null,
      },
    });
  }

  async createResetToken(params: {
    identityId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.iamPasswordResetToken.create({
      data: {
        identityId: params.identityId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  async invalidateUnusedResetTokens(identityId: string) {
    return prisma.iamPasswordResetToken.updateMany({
      where: { identityId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async findResetTokenByHash(tokenHash: string) {
    return prisma.iamPasswordResetToken.findUnique({
      where: { tokenHash },
      include: {
        identity: { include: { passwordCreds: true } },
      },
    });
  }

  async markResetTokenUsed(id: string) {
    return prisma.iamPasswordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async getPasswordStatus(identityId: string) {
    return prisma.iamIdentity.findUnique({
      where: { id: identityId },
      include: {
        passwordCreds: {
          select: {
            id: true,
            passwordChangedAt: true,
            algorithm: true,
          },
        },
      },
    });
  }
}

export const passwordRepository = new PasswordRepository();
