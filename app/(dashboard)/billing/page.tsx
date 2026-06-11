"use client";

import { CreditCard, Calendar, Shield } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Subscription and payment management" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Current Plan" subtitle="OTTO Cloud subscription">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <CreditCard size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Starter Plan</p>
                <p className="text-xs text-text-secondary">Free during beta</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Calendar size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Billing Period</p>
                <p className="text-xs text-text-secondary">No active subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Shield size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Usage</p>
                <p className="text-xs text-text-secondary">Unlimited during beta</p>
              </div>
            </div>
            <Button variant="primary" size="sm" disabled>Manage Subscription</Button>
          </div>
        </Card>
        <Card title="Payment Methods" subtitle="No payment methods on file">
          <p className="text-sm text-text-secondary">Billing will be enabled in a future update. You are currently on the free beta plan.</p>
        </Card>
      </div>
    </div>
  );
}
