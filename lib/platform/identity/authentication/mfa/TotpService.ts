/**
 * TotpService — RFC 6238 TOTP generate/verify (A.4).
 */

import {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} from "./totp";
import { encryptSecret, decryptSecret } from "../crypto/secret-box";
import { getPlatformConfig } from "@/lib/platform/config";

export class TotpService {
  generateSecret(): string {
    return generateTotpSecret();
  }

  encryptSecret(plain: string): { ciphertext: string; keyVersion: number } {
    return encryptSecret(plain);
  }

  decryptSecret(ciphertext: string, keyVersion: number): string {
    return decryptSecret(ciphertext, keyVersion);
  }

  otpauthUrl(params: { secret: string; accountName: string }): string {
    const issuer = getPlatformConfig().security.mfa.totpIssuer;
    return buildOtpAuthUrl({
      secret: params.secret,
      accountName: params.accountName,
      issuer,
    });
  }

  verify(secretBase32: string, code: string): boolean {
    const window = getPlatformConfig().security.mfa.totpWindow;
    return verifyTotp(secretBase32, code, window);
  }
}

export const totpService = new TotpService();
