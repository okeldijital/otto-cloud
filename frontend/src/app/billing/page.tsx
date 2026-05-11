import { useEffect, useState } from "react";
import { useSession } from "../../contexts/SessionContext";

interface PlanInfo {
  name: string;
  job_limit: number;
  price: number | null;
}

interface UsageInfo {
  jobs: number;
  limit: number;
}

export default function BillingPage() {
  const { user } = useSession();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("http://localhost:8000/api/billing/info", {
          headers: {
            "x-user-id": user?.id || "",
            "x-org-id": user?.orgId || "",
          },
        });
        const data = await res.json();
        if (data.success) {
          setPlan(data.data.plan);
          setUsage(data.data.usage);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchBilling();
  }, [user]);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-org-id": user?.orgId || "",
        },
        body: JSON.stringify({ plan_id: "pro" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="billing-page">
      <h1>Billing & Usage</h1>

      <div className="current-plan">
        <h2>Current Plan</h2>
        {plan ? (
          <div>
            <p>Plan: {plan.name}</p>
            <p>Job limit: {plan.job_limit}/month</p>
            {plan.price && <p>Price: ${plan.price}/month</p>}
          </div>
        ) : (
          <p>Free plan (100 jobs/month)</p>
        )}
      </div>

      <div className="usage">
        <h2>This Month Usage</h2>
        {usage ? (
          <p>{usage.jobs} / {usage.limit} jobs</p>
        ) : (
          <p>0 / 100 jobs</p>
        )}
      </div>

      <div className="upgrade">
        <button onClick={handleUpgrade}>
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}