"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account and application settings" />
      <Card title="Coming Soon" subtitle="Settings page is under development." />
    </div>
  );
}
