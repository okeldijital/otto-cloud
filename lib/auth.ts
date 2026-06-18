import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;
        if (!user.is_active) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.hashed_password);
        if (!isPasswordValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login: new Date() },
        });

        const tenantUser = await prisma.tenant_users.findFirst({
          where: { user_id: user.id, is_default: true },
          select: { tenant_id: true },
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          tenant_id: tenantUser?.tenant_id || user.tenant_id,
          organization_id: user.organization_id,
          role: user.role,
          is_superuser: user.is_superuser,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenant_id = (user as any).tenant_id;
        token.organization_id = (user as any).organization_id;
        token.role = (user as any).role;
        token.is_superuser = (user as any).is_superuser;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).tenant_id = token.tenant_id as string;
        (session.user as any).organization_id = token.organization_id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).is_superuser = token.is_superuser as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
