import { useSession } from "../contexts/SessionContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}