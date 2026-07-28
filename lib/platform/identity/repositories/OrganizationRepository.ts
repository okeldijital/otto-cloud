import { prisma } from "@/lib/prisma";

export class OrganizationRepository {
  async create(data: {
    name: string;
    slug: string;
    ownerIdentityId?: string | null;
    legacyTenantId?: string | null;
    mfaPolicy?: string;
    policies?: object;
  }) {
    return prisma.iamOrganization.create({
      data: {
        name: data.name,
        slug: data.slug,
        status: "active",
        ownerIdentityId: data.ownerIdentityId ?? null,
        legacyTenantId: data.legacyTenantId ?? null,
        mfaPolicy: data.mfaPolicy ?? "optional",
        policies: data.policies ?? {},
      },
    });
  }

  async findById(id: string) {
    return prisma.iamOrganization.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return prisma.iamOrganization.findUnique({ where: { slug } });
  }

  async update(
    id: string,
    data: {
      name?: string;
      status?: string;
      mfaPolicy?: string;
      policies?: object;
      ownerIdentityId?: string | null;
    }
  ) {
    return prisma.iamOrganization.update({
      where: { id },
      data: {
        ...data,
        policies: data.policies as object | undefined,
      },
    });
  }

  async bumpRoleVersion(organizationId: string) {
    return prisma.iamOrganization.update({
      where: { id: organizationId },
      data: { roleVersion: { increment: 1 } },
      select: { roleVersion: true },
    });
  }

  async list(params?: { status?: string; limit?: number; offset?: number }) {
    const limit = Math.min(params?.limit ?? 50, 200);
    const offset = params?.offset ?? 0;
    const where = params?.status ? { status: params.status } : {};
    const [rows, total] = await Promise.all([
      prisma.iamOrganization.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.iamOrganization.count({ where }),
    ]);
    return { rows, total, limit, offset };
  }
}

export const organizationRepository = new OrganizationRepository();
