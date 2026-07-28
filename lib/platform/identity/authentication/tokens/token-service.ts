/**
 * TokenService — access token issue/verify (HMAC, short-lived).
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getPlatformConfig } from "@/lib/platform/config";
import { generateSecureToken, hashToken } from "../crypto/tokens";
import { IdentityError } from "../../domain/types";

function signingKey(): string {
  return (
    process.env.IAM_ACCESS_TOKEN_SECRET ||
    process.env.IAM_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "otto-iam-dev-access-secret"
  );
}

export interface AccessTokenClaims {
  sub: string; // identityId
  sid: string; // sessionId
  org?: string | null;
  exp: number;
  iat: number;
}

export class TokenService {
  issueOpaque(): { token: string; hash: string } {
    const token = generateSecureToken(32);
    return { token, hash: hashToken(token) };
  }

  hash(token: string): string {
    return hashToken(token);
  }

  issueAccessToken(params: {
    identityId: string;
    sessionId: string;
    organizationId?: string | null;
  }): { token: string; expiresAt: Date } {
    const minutes = getPlatformConfig().security.session.accessTokenMinutes;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + minutes * 60;
    const body: AccessTokenClaims = {
      sub: params.identityId,
      sid: params.sessionId,
      org: params.organizationId ?? null,
      iat,
      exp,
    };
    const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
    const sig = createHmac("sha256", signingKey())
      .update(payload)
      .digest("base64url");
    return {
      token: `${payload}.${sig}`,
      expiresAt: new Date(exp * 1000),
    };
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const parts = token.split(".");
    if (parts.length !== 2) {
      throw new IdentityError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
    }
    const [payload, sig] = parts;
    const expected = createHmac("sha256", signingKey())
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new IdentityError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
    }
    let claims: AccessTokenClaims;
    try {
      claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      throw new IdentityError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
    }
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
      throw new IdentityError("Access token expired", 401, "ACCESS_TOKEN_EXPIRED");
    }
    return claims;
  }
}

export const tokenService = new TokenService();
