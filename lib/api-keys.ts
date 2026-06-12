import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const KEY_PREFIX = "otto_";

export function generateApiKey(): { raw: string; prefix: string; hash: string; lastFour: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const prefix = KEY_PREFIX + raw.slice(0, 6);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const lastFour = raw.slice(-4);
  return { raw, prefix, hash, lastFour };
}

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function validateApiKey(authorization: string | null): Promise<{
  valid: boolean;
  key?: any;
  error?: string;
}> {
  if (!authorization) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith(KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  const raw = token.slice(KEY_PREFIX.length);
  const key = await prisma.api_keys.findFirst({
    where: {
      key_hash: hashKey(token),
      is_active: true,
      revoked_at: null,
    },
  });

  if (!key) {
    return { valid: false, error: "Invalid or revoked API key" };
  }

  if (key.expires_at && key.expires_at < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  await prisma.api_keys.update({
    where: { id: key.id },
    data: { last_used_at: new Date() },
  });

  return { valid: true, key };
}

export function getOrgIdFromApiKey(key: any): string {
  return key.organization_id;
}

export const validScopes = ["catalog:read", "catalog:write", "royalties:read", "contracts:read", "reports:read"] as const;
export type ApiScope = (typeof validScopes)[number];

export function keyHasScope(key: any, requiredScope: ApiScope): boolean {
  if (!key.scopes) return false;
  const scopes = key.scopes.split(",").map((s: string) => s.trim());
  return scopes.includes(requiredScope) || scopes.includes("*");
}
