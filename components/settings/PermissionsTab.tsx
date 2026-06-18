"use client";
import { useState, useEffect } from "react";
import { Shield, Search } from "lucide-react";
import api from "@/lib/api";

export default function PermissionsTab() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/iam/permissions").then(r => {
      setPermissions(r.data?.permissions || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = permissions.filter(p =>
    !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()) || p.module.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, typeof filtered> = {};
  for (const p of filtered) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input className="input w-full pl-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search permissions..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([module, perms]) => (
          <div key={module} className="bg-white/5 rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-text-secondary mb-3">{module}</h3>
            <div className="space-y-2">
              {perms.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Shield size={12} className="text-accent shrink-0" />
                  <div>
                    <p className="text-xs text-white font-medium">{p.name}</p>
                    <code className="text-[10px] text-text-secondary font-mono">{p.code}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
