"use client";

import { useState, useEffect } from "react";
import { CreditCard, Calendar, Shield, Check, Loader } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get("/plans"),
        api.get("/subscriptions"),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setSubscription(subRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSelectPlan = async (planId: number) => {
    setChanging(true);
    try {
      const res = await api.post("/subscriptions", { plan_id: planId });
      setSubscription(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update subscription");
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading billing...</div>;

  const currentPlan = subscription?.plans || null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" subtitle="Subscription and payment management" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.id === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-white/5 bg-premium-glass hover:border-white/20"
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" size="sm">Current</Badge>
                </div>
              )}
              <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-text-secondary mb-4">{plan.description || ""}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  ${Number(plan.price).toFixed(0)}
                </span>
                <span className="text-text-secondary text-sm">/month</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-success" />
                  {plan.job_limit >= 99999 ? "Unlimited jobs" : `${plan.job_limit} jobs/mo`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className={plan.max_team_members > 1 ? "text-success" : "text-text-secondary"} />
                  {plan.max_team_members >= 999 ? "Unlimited team members" : `${plan.max_team_members} team member${plan.max_team_members > 1 ? "s" : ""}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className={plan.max_storage_mb >= 500 ? "text-success" : "text-text-secondary"} />
                  {plan.max_storage_mb >= 50000 ? "50 GB storage" : `${plan.max_storage_mb} MB storage`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className={plan.ai_enabled ? "text-success" : "text-text-secondary"} />
                  {plan.ai_enabled ? "AI features" : "No AI"}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className={plan.reports_enabled ? "text-success" : "text-text-secondary"} />
                  {plan.reports_enabled ? "Reports & analytics" : "No reports"}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className={plan.advanced_contracts ? "text-success" : "text-text-secondary"} />
                  {plan.advanced_contracts ? "Advanced contracts" : "Basic contracts"}
                </li>
              </ul>
              <Button
                variant={isCurrent ? "secondary" : "primary"}
                size="sm"
                className="w-full"
                disabled={isCurrent || changing}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {changing ? <Loader size={14} className="animate-spin" /> : isCurrent ? "Current Plan" : "Select Plan"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Subscription Details">
          {currentPlan ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <CreditCard size={20} className="text-accent" />
                <div>
                  <p className="text-sm text-white font-medium">{currentPlan.name} Plan</p>
                  <p className="text-xs text-text-secondary">${Number(currentPlan.price).toFixed(2)}/mo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <Calendar size={20} className="text-accent" />
                <div>
                  <p className="text-sm text-white font-medium">Billing Period</p>
                  <p className="text-xs text-text-secondary">
                    {subscription.status} &middot; renews {periodEnd}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <Shield size={20} className="text-accent" />
                <div>
                  <p className="text-sm text-white font-medium">Status</p>
                  <Badge variant={subscription.status === "active" ? "success" : "neutral"} size="sm">
                    {subscription.status}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No active subscription. Select a plan above to get started.</p>
          )}
        </Card>

        <Card title="Payment Methods">
          <p className="text-sm text-text-secondary">
            No payment methods on file. Payment processing will be enabled when Stripe is fully configured.
          </p>
        </Card>
      </div>
    </div>
  );
}
