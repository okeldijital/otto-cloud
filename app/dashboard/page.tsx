export default function Dashboard() {
  return (
    <div className="min-h-screen bg-app-default p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
          <h2 className="text-xl font-semibold mb-2">Projects</h2>
          <p className="text-white/70">Manage your projects here.</p>
        </div>
      </div>
    </div>
  );
}
