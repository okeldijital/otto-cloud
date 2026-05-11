import { useEffect, useState } from "react";

interface Stats {
  total_jobs: number;
  active_users: number;
  revenue: number;
  db_status: string;
  redis_status: string;
}

interface Metrics {
  totalJobs: number;
  failedJobs: number;
  avgDuration: number;
  jobsPerOrg: { org_id: string; count: number }[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, metricsRes] = await Promise.all([
          fetch("http://localhost:8000/api/admin/stats"),
          fetch("http://localhost:8000/api/admin/metrics"),
        ]);

        const statsData = await statsRes.json();
        const metricsData = await metricsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (metricsData.success) setMetrics(metricsData.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  const topOrgs = metrics?.jobsPerOrg
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 5) || [];

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Jobs</h3>
          <p>{stats?.total_jobs ?? 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{stats?.active_users ?? 0}</p>
        </div>

        <div className="stat-card">
          <h3>Revenue</h3>
          <p>${stats?.revenue ?? 0}</p>
        </div>

        <div className="stat-card">
          <h3>System Status</h3>
          <p>DB: {stats?.db_status ?? "unknown"}</p>
          <p>Redis: {stats?.redis_status ?? "unknown"}</p>
        </div>
      </div>

      <div className="metrics-section">
        <h2>Metrics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Jobs (All Time)</h3>
            <p>{metrics?.totalJobs ?? 0}</p>
          </div>

          <div className="stat-card">
            <h3>Failed Jobs (30 days)</h3>
            <p>{metrics?.failedJobs ?? 0}</p>
          </div>

          <div className="stat-card">
            <h3>Avg Duration (ms)</h3>
            <p>{metrics?.avgDuration?.toFixed(0) ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="org-usage-section">
        <h2>Top Organizations by Usage</h2>
        <table className="org-usage-table">
          <thead>
            <tr>
              <th>Organization ID</th>
              <th>Job Count</th>
            </tr>
          </thead>
          <tbody>
            {topOrgs.map((org) => (
              <tr key={org.org_id}>
                <td>{org.org_id}</td>
                <td>{org.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}