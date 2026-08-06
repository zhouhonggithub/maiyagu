'use client';

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Members</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage team members and their access permissions</p>
        </div>
        <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + Invite Member
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Invite team members to collaborate on farm management. Assign roles like admin, operator, or viewer.
        </p>
      </div>
    </div>
  );
}
