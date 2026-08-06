'use client';

export default function FarmDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Farm Dashboard</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Overview of your farm status and recent activity</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Online Devices</p>
          <p className="text-2xl font-bold mt-1">0 / 0</p>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Active Plots</p>
          <p className="text-2xl font-bold mt-1">0</p>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Pending Commands</p>
          <p className="text-2xl font-bold mt-1">0</p>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">AI Alerts</p>
          <p className="text-2xl font-bold mt-1">0</p>
        </div>
      </div>

      {/* Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <p className="text-sm text-[var(--muted-foreground)]">No activity recorded yet. Connect your first device to get started.</p>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h3 className="font-semibold mb-3">AI Insights</h3>
          <p className="text-sm text-[var(--muted-foreground)]">AI analysis will appear here once devices are collecting data.</p>
        </div>
      </div>
    </div>
  );
}
