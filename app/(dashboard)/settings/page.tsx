"use client";

import { useState, useEffect } from "react";
import { User, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    api.get("/users").then(r => {
      setUser(r.data);
      setName(r.data?.name || "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/users", { full_name: name });
      setUser(res.data);
      alert("Settings saved");
    } catch {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account and application settings" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Profile" subtitle="Manage your account details">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary font-bold">Name</label>
              <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold">Email</label>
              <input className="input w-full" value={user?.email || ""} disabled />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold">Role</label>
              <input className="input w-full" value={user?.role || (user?.is_superuser ? "Admin" : "User")} disabled />
            </div>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
        <Card title="Preferences" subtitle="Application preferences">
          <p className="text-sm text-text-secondary">Additional settings will appear here as the platform evolves.</p>
        </Card>
      </div>
    </div>
  );
}
