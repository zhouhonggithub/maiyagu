'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

type TabStatus = 'pending' | 'accepted' | 'done' | 'rejected';

const typeColors: Record<string, string> = {
  irrigation: 'bg-blue-100 text-blue-700',
  fertilize: 'bg-green-100 text-green-700',
  harvest: 'bg-yellow-100 text-yellow-700',
  inspect: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function CommandsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabStatus>('pending');

  const { data: commands, isLoading } = useQuery({
    queryKey: ['commands', tab],
    queryFn: () => apiFetch<Array<{
      id: string; memberName: string; plotCode: string; type: string;
      description: string; status: string; createdAt: string;
    }>>(`/farm/commands?status=${tab}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Command Queue</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Manage member commands and farm operations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['pending', 'accepted', 'done', 'rejected'] as TabStatus[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading commands...</p>
      ) : commands?.length ? (
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div key={cmd.id} onClick={() => router.push(`/commands/${cmd.id}`)} className="bg-white rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[cmd.type] || typeColors.other}`}>{cmd.type}</span>
                  <span className="text-sm font-medium">{cmd.memberName}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">· {cmd.plotCode}</span>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{new Date(cmd.createdAt).toLocaleString()}</span>
              </div>
              {cmd.description && <p className="text-sm text-[var(--muted-foreground)] truncate">{cmd.description}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">No {tab} commands</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Commands with status "{tab}" will appear here.</p>
        </div>
      )}
    </div>
  );
}
