"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function NetworkIndividualsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Individuals" subtitle="Individual contacts in your network" />
      <Card title="Coming Soon" subtitle="Individual contact management is under development." />
    </div>
  );
}
