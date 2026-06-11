"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Control" subtitle="System administration" />
      <Card title="Coming Soon" subtitle="Admin panel is under development." />
    </div>
  );
}
