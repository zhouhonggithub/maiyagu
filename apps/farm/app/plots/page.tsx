'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

type PlotStatus = 'all' | 'vacant' | 'occupied' | 'maintenance';

const statusColors: Record<string, string> = {
  vacant: 'bg-gray-100 text-gray-700',
  occupied: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
};

export default function PlotsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<PlotStatus>('all');

  const { data: plots, isLoading } = useQuery({
    queryKey: ['plots'],
    queryFn: () => apiFetch<Array<{
      id: string; code: string; name: string; status: string; currentCrop: string;
      healthScore: number; boundMemberName: string | null;
    }>>('/farm/plots'),
  });

  const filtered = plots?.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plots</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage farm plots and track crop growth</p>
        </div>
        <button onClick={() => router.push('/plots/create')} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">+ Create Plot</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'vacant', 'occupied', 'maintenance'] as PlotStatus[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading plots...</p>
      ) : filtered?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plot) => (
            <div key={plot.id} onClick={() => router.push(`/plots/${plot.id}`)} className="bg-white rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{plot.code} - {plot.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[plot.status] || 'bg-gray-100 text-gray-700'}`}>{plot.status}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{plot.currentCrop || 'No crop'}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${plot.healthScore}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>{plot.healthScore}% health</span>
                <span>{plot.boundMemberName || 'Vacant'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-4">🌱</div>
          <h3 className="text-lg font-semibold mb-2">No plots found</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Create your first plot to get started.</p>
        </div>
      )}
    </div>
  );
}
