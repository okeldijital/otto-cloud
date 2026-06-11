"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function PlaylistsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Playlists" subtitle="Curated track playlists" />
      <Card title="Coming Soon" subtitle="Playlists module is under development." />
    </div>
  );
}
