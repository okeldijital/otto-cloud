import { prisma } from "@/lib/prisma";

export interface FeatureCheck {
  allowed: boolean;
  limit: number;
  current: number;
  name: string;
}

export async function getOrgSubscription(orgId: string) {
  const sub = await prisma.subscriptions.findFirst({
    where: { organization_id: orgId },
    include: { plans: true },
  });
  return sub;
}

export async function checkFeature(orgId: string, feature: keyof typeof FEATURE_MAP): Promise<FeatureCheck> {
  const sub = await getOrgSubscription(orgId);
  if (!sub) return { allowed: false, limit: 0, current: 0, name: feature };

  const plan = sub.plans;
  const { limitKey, metric, period } = FEATURE_MAP[feature];

  const allowed = !!(plan as any)[limitKey];
  const usage = metric
    ? await prisma.usage.findFirst({ where: { organization_id: orgId, metric, period } })
    : null;
  const current = usage?.value ?? 0;

  return { allowed, limit: 0, current, name: feature };
}

export async function checkUsageLimit(orgId: string, metric: string, period = "monthly"): Promise<FeatureCheck> {
  const sub = await getOrgSubscription(orgId);
  if (!sub) return { allowed: false, limit: 0, current: 0, name: metric };

  let limit = 0;
  const plan = sub.plans;
  if (metric === "team_members") limit = plan.max_team_members;
  else if (metric === "storage_mb") limit = plan.max_storage_mb;
  else if (metric === "tracks" || metric === "releases") limit = plan.job_limit;
  else return { allowed: true, limit: 0, current: 0, name: metric };

  const usage = await prisma.usage.findFirst({
    where: { organization_id: orgId, metric, period },
  });
  const current = usage?.value ?? 0;

  return { allowed: current < limit, limit, current, name: metric };
}

const FEATURE_MAP = {
  ai: { limitKey: "ai_enabled", metric: "ai_tokens", period: "monthly" },
  reports: { limitKey: "reports_enabled", metric: null, period: null },
  advanced_contracts: { limitKey: "advanced_contracts", metric: null, period: null },
} as const;
