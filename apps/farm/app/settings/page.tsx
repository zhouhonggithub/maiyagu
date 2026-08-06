'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Manage farm configuration, notifications, and integrations</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-2">Farm Profile</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Basic information about your farm
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Farm Name</label>
              <input
                type="text"
                placeholder="Enter farm name"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                placeholder="Enter location"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
                disabled
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-2">Notifications</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Configure how you receive alerts and updates
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm">Device offline alerts</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm">AI analysis complete</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm">Daily summary report</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-2">Plan & Billing</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Current plan: <span className="font-medium">Free</span>
          </p>
        </div>
      </div>
    </div>
  );
}
