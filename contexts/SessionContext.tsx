/**
 * @deprecated Use AuthContext from `@/contexts/AuthContext` (IAM).
 * Kept as a thin re-export so accidental imports do not resurrect localStorage auth.
 */

"use client";

export {
  AuthProvider as SessionProvider,
  useAuth as useSession,
} from "./AuthContext";
