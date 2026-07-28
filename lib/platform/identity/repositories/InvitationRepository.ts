import { prisma } from "@/lib/prisma";

export class InvitationRepository {
  async create(data: {
    organizationId: string;
    email: string;
    emailNormalized: string;
    roleId?: string | null;
    tokenHash: string;
    invitedById?: string | null;
    expiresAt: Date;
  }) {
    return prisma.iamInvitation.create({
      data: {
        organizationId: data.organizationId,
        email: data.email,
        emailNormalized: data.emailNormalized,
        roleId: data.roleId ?? null,
        tokenHash: data.tokenHash,
        invitedById: data.invitedById ?? null,
        expiresAt: data.expiresAt,
        status: "pending",
      },
    });
  }

  async findByTokenHash(tokenHash: string) {
    return prisma.iamInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.iamInvitation.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async listForOrganization(organizationId: string) {
    return prisma.iamInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { acceptedAt?: Date }
  ) {
    return prisma.iamInvitation.update({
      where: { id },
      data: {
        status,
        acceptedAt: extra?.acceptedAt,
      },
    });
  }
}

export const invitationRepository = new InvitationRepository();
