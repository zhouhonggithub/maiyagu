'use client';

export default function PlotsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Plots</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage your farm plots, assign devices, and track crop growth</p>
        </div>
        <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + New Plot
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
        <div className="text-4xl mb-4">🌱</div>
        <h3 className="text-lg font-semibold mb-2">No plots configured</h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Create plots to organize your farmland. Each plot can have assigned devices, crop types, and AI monitoring rules.
        </p>
      </div>
    </div>
  );
}
