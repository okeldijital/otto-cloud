"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Subscription and payment management" />
      <Card title="Coming Soon" subtitle="Billing page is under development." />
    </div>
  );
}
