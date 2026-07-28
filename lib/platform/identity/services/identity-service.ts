/**
 * IdentityService — identity domain (who), not authentication (proof).
 * Does not implement login; that is AuthenticationService in A.1.
 */

import { prisma } from "@/lib/prisma";
import { hashPassword } from "../authentication/crypto/password";
import { normalizeEmail } from "../authentication/crypto/tokens";
import { assertPasswordStrength } from "../authentication/passwords/password-policy";
import { IdentityError } from "../domain/types";

export class IdentityService {
  async findByEmail(email: string) {
    const emailNormalized = normalizeEmail(email);
    return prisma.iamIdentity.findUnique({
      where: { emailNormalized },
    });
  }

  async findById(id: string) {
    return prisma.iamIdentity.findUnique({ where: { id } });
  }

  /**
   * Create identity + password credential.
   * Email starts as pending_verification until A.1 verification flow.
   */
  async createWithPassword(params: {
    email: string;
    password: string;
    displayName?: string;
    legacyUserId?: number | null;
  }) {
    assertPasswordStrength(params.password);
    const email = params.email.trim();
    const emailNormalized = normalizeEmail(email);

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new IdentityError(
        "Identity already exists",
        409,
        "IDENTITY_EXISTS"
      );
    }

    const passwordHash = await hashPassword(params.password);

    const identity = await prisma.iamIdentity.create({
      data: {
        email,
        emailNormalized,
        displayName: params.displayName ?? null,
        status: "pending_verification",
        legacyUserId: params.legacyUserId ?? null,
        passwordCreds: {
          create: {
            passwordHash,
            algorithm: "argon2id",
            passwordChangedAt: new Date(),
          },
        },
        credentials: {
          create: {
            type: "password",
            isPrimary: true,
          },
        },
      },
    });

    return identity;
  }
}

export const identityService = new IdentityService();
