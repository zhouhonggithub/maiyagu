'use client';

export default function CommandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Commands</h2>
          <p className="text-sm text-[var(--muted-foreground)]">View and manage device command queue and execution history</p>
        </div>
        <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + New Command
        </button>
      </div>

      {/* Command Queue */}
      <div className="bg-white rounded-lg border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold">Command Queue</h3>
        </div>
        <div className="p-12 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">No pending commands</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Commands sent to devices will appear here. You can schedule irrigation, adjust sensors, or trigger captures.
          </p>
        </div>
      </div>
    </div>
  );
}
