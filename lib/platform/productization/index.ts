import { prisma } from "@/lib/prisma";

export const PRODUCT_PLAN_KEYS = {
  CORE: "OTTO_CORE",
  NETWORK: "OTTO_NETWORK",
  RIGHTS: "OTTO_RIGHTS",
  ROYALTIES: "OTTO_ROYALTIES",
  OFFICE: "OTTO_OFFICE",
  WORKSPACE: "OTTO_WORKSPACE",
  AI: "OTTO_AI",
  CONTRACTS_OCR: "OTTO_CONTRACTS_OCR",
} as const;

export type ProductFeature =
  | "catalog"
  | "contracts.core"
  | "contracts.ocr"
  | "network"
  | "rights"
  | "royalties"
  | "office"
  | "workspace"
  | "ai";

export type ProductEntitlement = {
  planKey: string;
  status: string;
  licenseType: string;
  startsAt: Date;
  expiresAt: Date | null;
  features: ProductFeature[];
};

export type ProductEntitlementContext = {
  organizationId: string;
  planKeys: string[];
  features: ProductFeature[];
  entitlements: ProductEntitlement[];
};

const CORE_FEATURES: ProductFeature[] = ["catalog", "contracts.core"];
const PLAN_FEATURES: Record<string, ProductFeature[]> = {
  [PRODUCT_PLAN_KEYS.CORE]: CORE_FEATURES,
  [PRODUCT_PLAN_KEYS.NETWORK]: ["network"],
  [PRODUCT_PLAN_KEYS.RIGHTS]: ["rights"],
  [PRODUCT_PLAN_KEYS.ROYALTIES]: ["royalties"],
  [PRODUCT_PLAN_KEYS.OFFICE]: ["office"],
  [PRODUCT_PLAN_KEYS.WORKSPACE]: ["workspace"],
  [PRODUCT_PLAN_KEYS.AI]: ["ai"],
  [PRODUCT_PLAN_KEYS.CONTRACTS_OCR]: ["contracts.ocr"],
};

function isActiveLicense(
  row: { status: string; startsAt: Date; expiresAt: Date | null },
  now = new Date()
) {
  return (
    row.status === "active" &&
    row.startsAt <= now &&
    (row.expiresAt === null || row.expiresAt > now)
  );
}

/**
 * Commercial authorization is deliberately separate from IAM permissions.
 * IAM answers "may this user perform the action?"; this service answers
 * "does this organization own the product capability?".
 */
export async function resolveProductEntitlements(
  organizationId: string
): Promise<ProductEntitlementContext> {
  const rows = await prisma.$queryRaw<
    Array<{
      planKey: string;
      status: string;
      licenseType: string;
      startsAt: Date;
      expiresAt: Date | null;
      features: unknown;
    }>
  >`
    SELECT
      p.key AS "planKey",
      l.status AS "status",
      l.license_type AS "licenseType",
      l.starts_at AS "startsAt",
      l.expires_at AS "expiresAt",
      p.features AS "features"
    FROM organization_product_licenses l
    INNER JOIN product_plans p ON p.id = l.product_plan_id
    WHERE l.organization_id = ${organizationId}::uuid
      AND p.active = true
  `;

  const active = rows.filter((row) => isActiveLicense(row));
  const featureSet = new Set<ProductFeature>();

  for (const row of active) {
    const configured = Array.isArray(row.features)
      ? row.features.filter((f): f is ProductFeature => typeof f === "string")
      : [];
    const features = configured.length
      ? configured
      : PLAN_FEATURES[row.planKey] ?? [];
    for (const feature of features) featureSet.add(feature);
  }

  return {
    organizationId,
    planKeys: active.map((row) => row.planKey),
    features: [...featureSet],
    entitlements: active.map((row) => ({
      planKey: row.planKey,
      status: row.status,
      licenseType: row.licenseType,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      features: (
        Array.isArray(row.features)
          ? row.features.filter((f): f is ProductFeature => typeof f === "string")
          : PLAN_FEATURES[row.planKey] ?? []
      ),
    })),
  };
}

export async function hasProductFeature(
  organizationId: string,
  feature: ProductFeature
): Promise<boolean> {
  const context = await resolveProductEntitlements(organizationId);
  return context.features.includes(feature);
}

export function featureForPermission(permission: string): ProductFeature | null {
  const prefix = permission.split(".")[0];
  switch (prefix) {
    case "contracts":
      return permission === "contracts.ocr" ? "contracts.ocr" : "contracts.core";
    case "network":
      return "network";
    case "rights":
      return "rights";
    case "royalties":
      return "royalties";
    case "office":
    case "documents":
      return "office";
    case "workspace":
      return "workspace";
    case "ai":
      return "ai";
    default:
      return null;
  }
}

export function requiredProductFeatures(
  permissions: string | string[]
): ProductFeature[] {
  const values = Array.isArray(permissions) ? permissions : [permissions];
  return [
    ...new Set(
      values.map(featureForPermission).filter(Boolean) as ProductFeature[]
    ),
  ];
}
