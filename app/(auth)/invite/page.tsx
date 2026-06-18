"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Shield, CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function InvitePageWrapper() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background p-4"><p className="text-text-secondary">Loading...</p></div>}><InvitePage /></Suspense>;
}

function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); setError("No invitation token provided"); return; }
    api.get("/invitations", { params: { token } })
      .then(r => { setInvite(r.data); setName(r.data.email?.split("@")[0] || ""); })
      .catch(err => setError(err?.response?.data?.error || "Invalid invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setAccepting(true);
    setError("");
    try {
      await api.post("/invitations/accept", { token, password, name });
      setDone(true);
    } catch (err: any) { setError(err?.response?.data?.error || "Failed to accept invitation"); }
    finally { setAccepting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <Mail size={24} className="text-accent" />
          <h1 className="text-xl font-bold text-white">Accept Invitation</h1>
        </div>

        {loading && <p className="text-text-secondary text-center py-8">Loading invitation...</p>}

        {error && !loading && (
          <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
            <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {done && (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-success mx-auto" />
            <p className="text-white font-medium">Account created successfully!</p>
            <p className="text-sm text-text-secondary">You can now log in to your organization.</p>
            <Button variant="primary" onClick={() => router.push("/login")}>Go to Login</Button>
          </div>
        )}

        {invite && !done && (
          <div className="space-y-6">
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
              <p className="text-sm text-white font-medium">{invite.tenant_name}</p>
              <p className="text-xs text-text-secondary mt-1">has invited you to join their organization</p>
              {invite.message && <p className="text-xs text-text-secondary mt-2 italic">&ldquo;{invite.message}&rdquo;</p>}
            </div>

            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
              <Mail size={14} className="text-text-secondary" />
              <span className="text-sm text-text-secondary">{invite.email}</span>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Full Name</label>
                <input className="input w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Password <span className="text-danger">*</span></label>
                <input className="input w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
              </div>
              <Button variant="primary" fullWidth type="submit" disabled={accepting || !password}>
                {accepting ? "Setting up..." : <><Shield size={16} /> Accept & Create Account</>}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
