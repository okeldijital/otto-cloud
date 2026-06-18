import { prisma } from "@/lib/prisma";

export interface BrandingConfig {
  logo_url: string | null;
  banner_url: string | null;
  brand_color: string;
  secondary_color: string;
  accent_color: string;
  display_name: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: null,
  banner_url: null,
  brand_color: "#6366f1",
  secondary_color: "#8b5cf6",
  accent_color: "#06b6d4",
  display_name: null,
};

export async function getOrgBranding(tenantId: string): Promise<BrandingConfig> {
  if (!tenantId) return DEFAULT_BRANDING;

  const org = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      logo_url: true,
      banner_url: true,
      brand_color: true,
      secondary_color: true,
      accent_color: true,
      display_name: true,
    },
  });

  if (!org) return DEFAULT_BRANDING;

  return {
    logo_url: org.logo_url,
    banner_url: org.banner_url,
    brand_color: org.brand_color || DEFAULT_BRANDING.brand_color,
    secondary_color: org.secondary_color || DEFAULT_BRANDING.secondary_color,
    accent_color: org.accent_color || DEFAULT_BRANDING.accent_color,
    display_name: org.display_name,
  };
}

export function getDefaultBranding(): BrandingConfig {
  return DEFAULT_BRANDING;
}
