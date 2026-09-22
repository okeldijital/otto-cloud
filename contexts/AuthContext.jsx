"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} role
 * @property {boolean} emailVerified
 * @property {any} organization
 * @property {string[]} permissions
 * @property {string[]} roles
 * @property {string|undefined} sessionExpiresAt
 * @property {string|undefined} emailVerificationStatus
 * @property {"iam"} source
 *
 * @typedef {Object} AuthContextValue
 * @property {AuthUser|null} user
 * @property {boolean} loading
 * @property {string} statusMessage
 * @property {"iam"|null} authSource
 * @property {any} session
 * @property {{planKeys:string[],features:string[],entitlements:any[]}} productEntitlements
 * @property {(feature:string)=>boolean} hasProductFeature
 * @property {boolean} isPlatformAuthority
 * @property {boolean} canManageGlobalReferenceData
 * @property {(email:string,password:string,opts?:any)=>Promise<any>} login
 * @property {(mfaToken:string,code:string,opts?:any)=>Promise<any>} completeMfa
 * @property {(data:any)=>Promise<any>} register
 * @property {()=>Promise<void>} logout
 * @property {()=>Promise<AuthUser|null>} refreshUser
 * @property {boolean} isAuthenticated
 */

/**
 * AuthContext — IAM + organization-scoped commercial entitlements.
 * Session state from GET /api/auth/session; product access from
 * GET /api/auth/product-entitlements.
 *
 * Commercial entitlements fail closed: if the entitlement service is
 * unavailable, no licensed product feature is exposed by the client.
 */
/** @type {import("react").Context<AuthContextValue>} */
const AuthContext = createContext({
  user: null,
  loading: true,
  statusMessage: "",
  authSource: /** @type {"iam" | null} */ (null),
  session: null,
  productEntitlements: { planKeys: [], features: [], entitlements: [] },
  hasProductFeature: /** @type {(feature: string) => boolean} */ (() => false),
  isPlatformAuthority: false,
  canManageGlobalReferenceData: false,
  login: /** @type {(email: string, password: string, opts?: { rememberMe?: boolean }) => Promise<any>} */ (() => {}),
  completeMfa: /** @type {(mfaToken: string, code: string, opts?: any) => Promise<any>} */ (() => {}),
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
  const [productEntitlements, setProductEntitlements] = useState({ planKeys: [], features: [], entitlements: [] });
  const [productEntitlementsAvailable, setProductEntitlementsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearProductEntitlements = useCallback(() => {
    setProductEntitlements({ planKeys: [], features: [], entitlements: [] });
    setProductEntitlementsAvailable(false);
  }, []);

  const loadProductEntitlements = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/product-entitlements", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        clearProductEntitlements();
        return null;
      }
      const data = await res.json();
      const next = {
        planKeys: Array.isArray(data.planKeys) ? data.planKeys : [],
        features: Array.isArray(data.features) ? data.features : [],
        entitlements: Array.isArray(data.entitlements) ? data.entitlements : [],
      };
      setProductEntitlements(next);
      setProductEntitlementsAvailable(true);
      return next;
    } catch {
      clearProductEntitlements();
      return null;
    }
  }, [clearProductEntitlements]);

  const loadIamSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setIamSession(null);
        clearProductEntitlements();
        return null;
      }
      const data = await res.json();
      setIamSession(data);
      if (data?.authenticated) await loadProductEntitlements();
      else clearProductEntitlements();
      return data;
    } catch {
      setIamSession(null);
      clearProductEntitlements();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearProductEntitlements, loadProductEntitlements]);

  useEffect(() => { loadIamSession(); }, [loadIamSession]);

  const user = mapIamUser(iamSession);
  const isPlatformAuthority = !!user && (user.role === "platform_admin" || user.role === "super_admin" || user.roles?.includes("platform_admin") || user.roles?.includes("super_admin"));
  const canManageGlobalReferenceData = !!user && (isPlatformAuthority || user.role === "owner" || user.roles?.includes("owner"));
  const isAuthenticated = !!user;
  const hasProductFeature = (feature) =>
    productEntitlementsAvailable
      ? productEntitlements.features.includes(feature)
      : false;

  const login = async (email, password, opts = {}) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe: Boolean(opts.rememberMe) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");
    if (data.requiresMfa && data.mfaToken) return data;
    await loadIamSession();
    return data;
  };

  const completeMfa = async (mfaToken, code, opts = {}) => {
    const res = await fetch("/api/auth/mfa/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken, code, rememberMe: Boolean(opts.rememberMe), trustDevice: Boolean(opts.trustDevice) }),
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
    clearProductEntitlements();
    if (typeof window !== "undefined") window.location.href = "/auth/login";
  };

  const refreshUser = async () => mapIamUser(await loadIamSession());

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      statusMessage: loading ? "Authenticating..." : "",
      authSource: user ? "iam" : null,
      session: iamSession,
      productEntitlements,
      hasProductFeature,
      isPlatformAuthority,
      canManageGlobalReferenceData,
      login,
      completeMfa,
      register,
      logout,
      refreshUser,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
