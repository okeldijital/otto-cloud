"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function NetworkOrganizationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" subtitle="Organization contacts in your network" />
      <Card title="Coming Soon" subtitle="Organization management is under development." />
    </div>
  );
}
