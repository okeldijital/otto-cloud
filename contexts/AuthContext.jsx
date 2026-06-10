"use client";
import { createContext, useContext } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import api from "../lib/api";

const AuthContext = createContext({
  user: null,
  loading: true,
  statusMessage: "",
  login: /** @type {(email: string, password: string) => Promise<any>} */ (() => {}),
  register: /** @type {(data: any) => Promise<any>} */ (() => {}),
  logout: () => {},
  refreshUser: () => Promise.resolve(null),
  isAuthenticated: false,
});

export const AuthProvider = ({ children }) => {
  const { data: session, status } = useSession();

  const loading = status === "loading";
  const user = session?.user
    ? {
        id: parseInt(session.user.id),
        email: session.user.email,
        full_name: session.user.name,
        role: session.user.role || "user",
      }
    : null;

  const login = async (email, password) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Invalid credentials");
    }

    const res = await fetch("/api/auth/me");
    if (!res.ok) throw new Error("Failed to get user");
    const userData = await res.json();
    return userData;
  };

  const register = async (userData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Registration failed");
    }
    return res.json();
  };

  const logout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const refreshUser = async () => {
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
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
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
