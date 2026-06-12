import { prisma } from "@/lib/prisma";

export interface BrandingConfig {
  logo_url: string | null;
  brand_color: string;
  display_name: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: null,
  brand_color: "#6366f1",
  display_name: null,
};

export async function getOrgBranding(orgId: string): Promise<BrandingConfig> {
  const orgIdInt = parseInt(orgId);
  if (isNaN(orgIdInt)) return DEFAULT_BRANDING;

  const org = await prisma.organizations.findFirst({
    where: { organization_id: orgIdInt },
    select: { logo_url: true, brand_color: true, display_name: true },
  });

  if (!org) return DEFAULT_BRANDING;

  return {
    logo_url: org.logo_url,
    brand_color: org.brand_color || DEFAULT_BRANDING.brand_color,
    display_name: org.display_name,
  };
}
