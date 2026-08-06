'use client';

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Content</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Photos, videos, and AI-generated content from your farm</p>
        </div>
        <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + Upload
        </button>
      </div>

      {/* Gallery Empty State */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
        <div className="text-4xl mb-4">🖼️</div>
        <h3 className="text-lg font-semibold mb-2">No content yet</h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Farm photos, time-lapse videos, and AI-generated growth reports will appear here. Connect devices to start capturing automatically.
        </p>
      </div>
    </div>
  );
}
