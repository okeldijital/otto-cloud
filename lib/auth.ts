import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import {
  getLegacyCatalogScopeId,
  resolveCatalogOrganizationId,
} from "@/lib/auth/migration-compat";

/**
 * Resolve catalog organization_id for JWT at login / switch.
 * Uses membership default tenant when present; falls back to user.organization_id
 * for legacy-compat accounts. Does not invent new organization UUIDs.
 */
async function resolveSessionOrgClaims(userId: number): Promise<{
  tenant_id: string | null;
  organization_id: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization_id: true,
      tenant_id: true,
      is_superuser: true,
    },
  });

  if (!user) {
    throw new Error("User not found during session claim resolution");
  }

  const defaultMembership = await prisma.tenant_users.findFirst({
    where: { user_id: userId, is_default: true },
    select: { tenant_id: true },
  });

  const anyMembership = defaultMembership
    ? defaultMembership
    : await prisma.tenant_users.findFirst({
        where: { user_id: userId },
        select: { tenant_id: true },
      });

  const tenantId = anyMembership?.tenant_id || user.tenant_id || null;

  // Catalog scope: prefer mapped tenant → catalog id; else user.organization_id; else legacy if superuser
  let organizationId: string;
  if (tenantId) {
    // If user still carries legacy catalog UUID, keep catalog visibility under compat
    if (user.organization_id === getLegacyCatalogScopeId()) {
      organizationId = getLegacyCatalogScopeId();
    } else {
      organizationId = resolveCatalogOrganizationId(tenantId);
    }
  } else if (user.organization_id) {
    organizationId = user.organization_id;
  } else if (user.is_superuser) {
    organizationId = getLegacyCatalogScopeId();
  } else {
    // No org yet (post-register before invite/create) — empty scope; APIs return 403 via context
    organizationId = "";
  }

  return { tenant_id: tenantId, organization_id: organizationId };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;
        if (!user.is_active) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashed_password
        );
        if (!isPasswordValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login: new Date() },
        });

        const claims = await resolveSessionOrgClaims(user.id);

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          tenant_id: claims.tenant_id,
          organization_id: claims.organization_id,
          role: user.role,
          is_superuser: user.is_superuser,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.tenant_id = (user as any).tenant_id;
        token.organization_id = (user as any).organization_id;
        token.role = (user as any).role;
        token.is_superuser = (user as any).is_superuser;
      }

      // Organization switch / client session.update()
      if (trigger === "update" && session) {
        if (session.tenant_id !== undefined) {
          token.tenant_id = session.tenant_id;
        }
        if (session.organization_id !== undefined) {
          token.organization_id = session.organization_id;
        }
        if (session.tenantId !== undefined) {
          token.tenant_id = session.tenantId;
        }
        if (session.organizationId !== undefined) {
          token.organization_id = session.organizationId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).tenant_id = (token.tenant_id as string) || null;
        (session.user as any).organization_id = (token.organization_id as string) || "";
        (session.user as any).role = token.role as string;
        (session.user as any).is_superuser = token.is_superuser as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Exported for org switch route / tests */
export { resolveSessionOrgClaims };
