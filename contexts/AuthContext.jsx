"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession, signIn, signOut } from "next-auth/react";

/**
 * Dual-run AuthContext (A.1):
 * - Prefer IAM session from GET /api/auth/session (HttpOnly cookies).
 * - Fall back to legacy next-auth for unmigrated users.
 * Never mix both sources in one session.
 */

const AuthContext = createContext({
  user: null,
  loading: true,
  statusMessage: "",
  authSource: /** @type {"iam" | "legacy" | null} */ (null),
  session: null,
  login: /** @type {(email: string, password: string, opts?: { rememberMe?: boolean }) => Promise<any>} */ (
    () => {}
  ),
  register: /** @type {(data: any) => Promise<any>} */ (() => {}),
  logout: () => {},
  refreshUser: () => Promise.resolve(null),
  isAuthenticated: false,
});

function mapIamUser(sessionPayload) {
  if (!sessionPayload?.authenticated || !sessionPayload.identity) return null;
  const id = sessionPayload.identity;
  return {
    id: id.id,
    email: id.email,
    full_name: id.displayName || id.email,
    role: sessionPayload.roles?.[0] || "user",
    emailVerified: id.emailVerified,
    organization: sessionPayload.organization,
    permissions: sessionPayload.permissions || [],
    roles: sessionPayload.roles || [],
    sessionExpiresAt: sessionPayload.sessionExpiresAt,
    emailVerificationStatus: sessionPayload.emailVerificationStatus,
    source: "iam",
  };
}

export const AuthProvider = ({ children }) => {
  const { data: nextSession, status: nextStatus } = useSession();
  const [iamSession, setIamSession] = useState(null);
  const [iamLoading, setIamLoading] = useState(true);
  const [authSource, setAuthSource] = useState(/** @type {"iam" | "legacy" | null} */ (null));

  const loadIamSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setIamSession(null);
        return null;
      }
      const data = await res.json();
      setIamSession(data);
      if (data?.authenticated) {
        setAuthSource("iam");
      }
      return data;
    } catch {
      setIamSession(null);
      return null;
    } finally {
      setIamLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIamSession();
  }, [loadIamSession]);

  // Legacy next-auth only when no IAM session
  useEffect(() => {
    if (iamLoading) return;
    if (iamSession?.authenticated) {
      setAuthSource("iam");
      return;
    }
    if (nextStatus === "authenticated" && nextSession?.user) {
      setAuthSource("legacy");
    } else if (nextStatus !== "loading") {
      setAuthSource(null);
    }
  }, [iamLoading, iamSession, nextSession, nextStatus]);

  const iamUser = mapIamUser(iamSession);
  const legacyUser =
    !iamUser && nextSession?.user
      ? {
          id: parseInt(nextSession.user.id),
          email: nextSession.user.email,
          full_name: nextSession.user.name,
          role: nextSession.user.role || "user",
          source: "legacy",
        }
      : null;

  const user = iamUser || legacyUser;
  const loading = iamLoading || (nextStatus === "loading" && !iamUser);
  const isAuthenticated = !!user;

  const login = async (email, password, opts = {}) => {
    // 1) Try IAM native login first
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        rememberMe: Boolean(opts.rememberMe),
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      await loadIamSession();
      setAuthSource("iam");
      return data;
    }

    // 2) Dual-run: unmigrated users → next-auth only
    if (data.code === "LEGACY_AUTH_REQUIRED" || res.status === 409) {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        throw new Error("Invalid credentials");
      }
      setAuthSource("legacy");
      setIamSession(null);
      const me = await fetch("/api/auth/me");
      if (!me.ok) throw new Error("Failed to get user");
      return me.json();
    }

    throw new Error(data.error || "Login failed");
  };

  const register = async (userData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Registration failed");
    }
    return res.json();
  };

  const logout = async () => {
    if (authSource === "iam" || iamSession?.authenticated) {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => undefined);
      setIamSession(null);
      setAuthSource(null);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return;
    }
    signOut({ callbackUrl: "/login" });
  };

  const refreshUser = async () => {
    if (authSource === "iam" || iamSession?.authenticated) {
      const data = await loadIamSession();
      return mapIamUser(data);
    }
    const res = await fetch("/api/auth/me");
    if (!res.ok) throw new Error("Failed to refresh user");
    return res.json();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        statusMessage: loading ? "Authenticating..." : "",
        authSource,
        session: iamUser ? iamSession : nextSession,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
