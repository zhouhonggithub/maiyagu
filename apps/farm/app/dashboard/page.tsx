'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export default function FarmDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch<{ totalPlots: number; activeMembers: number; pendingCommands: number; camerasOnline: number }>('/farm/stats'),
  });

  const { data: recentCommands } = useQuery({
    queryKey: ['recent-commands'],
    queryFn: () => apiFetch<Array<{ id: string; type: string; status: string; memberName: string; plotCode: string; createdAt: string }>>('/farm/commands?limit=5&sort=-createdAt'),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiFetch<Array<{ id: string; name: string; status: string; lastHeartbeat: string }>>('/farm/devices'),
  });

  const { data: plots } = useQuery({
    queryKey: ['plots-health'],
    queryFn: () => apiFetch<Array<{ id: string; name: string; code: string; healthScore: number; currentCrop: string }>>('/farm/plots'),
  });

  const metrics = [
    { label: 'Total Plots', value: stats?.totalPlots ?? 0, icon: '🌱' },
    { label: 'Active Members', value: stats?.activeMembers ?? 0, icon: '👥' },
    { label: 'Pending Commands', value: stats?.pendingCommands ?? 0, icon: '⚡' },
    { label: 'Cameras Online', value: stats?.camerasOnline ?? 0, icon: '📷' },
  ];

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    executing: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Farm Dashboard</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Overview of your farm status and recent activity</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-lg border border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted-foreground)]">{m.label}</p>
              <span className="text-xl">{m.icon}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Commands */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h3 className="font-semibold mb-3">Recent Commands</h3>
          {recentCommands?.length ? (
            <ul className="space-y-2">
              {recentCommands.map((cmd) => (
                <li key={cmd.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[cmd.status] || 'bg-gray-100 text-gray-700'}`}>{cmd.status}</span>
                    <span className="text-[var(--muted-foreground)]">{cmd.memberName}</span>
                    <span>·</span>
                    <span className="font-medium">{cmd.plotCode}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{cmd.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No recent commands</p>
          )}
        </div>

        {/* Device Status */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-4">
          <h3 className="font-semibold mb-3">Device Status</h3>
          {devices?.length ? (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span>{d.name}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{d.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No devices connected</p>
          )}
        </div>
      </div>

      {/* Plot Health Grid */}
      <div>
        <h3 className="font-semibold mb-3">Plot Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plots?.length ? plots.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{p.code} - {p.name}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{p.currentCrop || 'No crop'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${p.healthScore}%` }} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{p.healthScore}% health</p>
            </div>
          )) : (
            <p className="text-sm text-[var(--muted-foreground)]">No plots configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
