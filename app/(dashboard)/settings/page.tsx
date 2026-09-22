"use client";

import { useEffect, useState } from "react";
import { Camera, Save } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import EntityArtwork from "@/components/media/EntityArtwork";
import { invalidateEntityArtwork, useAttachment } from "@/hooks/useAttachment";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { url: avatarUrl, refresh: refreshAvatar } = useAttachment("user", user?.id);

  useEffect(() => {
    api.get("/users")
      .then((response) => {
        setUser(response.data);
        setName(response.data?.name || "");
      })
      .catch(() => setError("Unable to load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.id) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setError("Profile picture must be a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 750 * 1024) {
      setError("Profile picture must be 750 KB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/users", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to upload profile picture.");

      setUser(data);
      invalidateEntityArtwork("user", user.id);
      await refreshAvatar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-border bg-surface-elevated/40 p-4">
          <EntityArtwork
            entityType="user"
            entityId={user?.id}
            src={avatarUrl}
            alt={name || "Profile"}
            size={72}
            placeholder="user"
            className="shrink-0 rounded-full border border-border"
            style={{ borderRadius: 999 }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Profile picture</p>
            <p className="mt-1 text-xs text-text-secondary">
              JPEG, PNG, or WebP · maximum 750 KB
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-surface">
              {uploadingAvatar ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-accent" />
              ) : (
                <Camera size={15} />
              )}
              {uploadingAvatar ? "Uploading..." : avatarUrl ? "Change picture" : "Add picture"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingAvatar}
                onChange={handleAvatarChange}
              />
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
