"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * AuthContext — IAM + organization-scoped commercial entitlements.
 * Session state from GET /api/auth/session; product access from
 * GET /api/auth/product-entitlements.
 */

const AuthContext = createContext({
  user: null,
  loading: true,
  statusMessage: "",
  authSource: /** @type {"iam" | null} */ (null),
  session: null,
  productEntitlements: { planKeys: [], features: [], entitlements: [] },
  hasProductFeature: /** @type {(feature: string) => boolean} */ (() => false),
  login: /** @type {(email: string, password: string, opts?: { rememberMe?: boolean }) => Promise<any>} */ (
    () => {}
  ),
  completeMfa: /** @type {(mfaToken: string, code: string, opts?: any) => Promise<any>} */ (
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
  const [iamSession, setIamSession] = useState(null);
  const [productEntitlements, setProductEntitlements] = useState({
    planKeys: [],
    features: [],
    entitlements: [],
  });
  const [loading, setLoading] = useState(true);

  const loadProductEntitlements = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/product-entitlements", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
        return null;
      }
      const data = await res.json();
      const next = {
        planKeys: Array.isArray(data.planKeys) ? data.planKeys : [],
        features: Array.isArray(data.features) ? data.features : [],
        entitlements: Array.isArray(data.entitlements) ? data.entitlements : [],
      };
      setProductEntitlements(next);
      return next;
    } catch {
      setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
      return null;
    }
  }, []);

  const loadIamSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setIamSession(null);
        setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
        return null;
      }
      const data = await res.json();
      setIamSession(data);
      if (data?.authenticated) await loadProductEntitlements();
      else setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
      return data;
    } catch {
      setIamSession(null);
      setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadProductEntitlements]);

  useEffect(() => {
    loadIamSession();
  }, [loadIamSession]);

  const user = mapIamUser(iamSession);
  const isAuthenticated = !!user;
  const hasProductFeature = (feature) => productEntitlements.features.includes(feature);

  const login = async (email, password, opts = {}) => {
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

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    if (data.requiresMfa && data.mfaToken) {
      return data;
    }

    await loadIamSession();
    return data;
  };

  const completeMfa = async (mfaToken, code, opts = {}) => {
    const res = await fetch("/api/auth/mfa/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mfaToken,
        code,
        rememberMe: Boolean(opts.rememberMe),
        trustDevice: Boolean(opts.trustDevice),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "MFA verification failed");
    await loadIamSession();
    return data;
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
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => undefined);
    setIamSession(null);
    setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  };

  const refreshUser = async () => {
    const data = await loadIamSession();
    return mapIamUser(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        statusMessage: loading ? "Authenticating..." : "",
        authSource: user ? "iam" : null,
        session: iamSession,
        productEntitlements,
        hasProductFeature,
        login,
        completeMfa,
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
