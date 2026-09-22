"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users")
      .then((response) => {
        setUser(response.data);
        setName(response.data?.name || "");
      })
      .catch(() => setError("Unable to load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.put("/users", { full_name: name });
      setUser(response.data);
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-text-secondary">Loading settings...</div>;
  }

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="Settings" subtitle="Personal account settings" />

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card title="Profile" subtitle="Manage your personal account details">
        <form onSubmit={handleSave} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Name</label>
            <input
              className="input w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Email</label>
            <input
              className="input w-full"
              value={user?.email || ""}
              disabled
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Role</label>
            <input
              className="input w-full"
              value={user?.role || (user?.is_superuser ? "Admin" : "User")}
              disabled
            />
          </div>

          <div className="sm:col-span-2 pt-1">
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
            <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Administration boundaries" subtitle="Where organization and platform administration lives">
        <div className="grid gap-4 text-sm text-text-secondary md:grid-cols-2">
          <p>
            Organization membership, invitations, roles, permissions, and organization security are managed
            from Organization Settings.
          </p>
          <p>
            Platform-wide organizations, users, and system health are managed from Admin Control by authorized
            platform administrators.
          </p>
        </div>
      </Card>
    </div>
  );
}
