'use client';

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Devices</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage cameras, sensors, and IoT devices connected to your farm</p>
        </div>
        <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + Add Device
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
        <div className="text-4xl mb-4">📷</div>
        <h3 className="text-lg font-semibold mb-2">No devices connected</h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Connect cameras, weather stations, or soil sensors to start monitoring your farm in real-time.
        </p>
      </div>
    </div>
  );
}
