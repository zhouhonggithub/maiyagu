'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showBindPlot, setShowBindPlot] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [schedule, setSchedule] = useState('');

  const { data: member } = useQuery({
    queryKey: ['member', id],
    queryFn: () => apiFetch<{ id: string; nickname: string; phone: string; status: string; subscriptionStart: string; subscriptionEnd: string }>(`/farm/members/${id}`),
  });

  const { data: bindings } = useQuery({
    queryKey: ['member-plots', id],
    queryFn: () => apiFetch<Array<{ id: string; plotId: string; plotCode: string; plotName: string }>>(`/farm/members/${id}/plots`),
  });

  const { data: captureSchedule } = useQuery({
    queryKey: ['member-schedule', id],
    queryFn: () => apiFetch<{ timeWaveConfig: string }>(`/farm/members/${id}/schedule`),
    select: (d) => { if (d?.timeWaveConfig && !schedule) setSchedule(d.timeWaveConfig); return d; },
  });

  const { data: allPlots } = useQuery({
    queryKey: ['all-plots'],
    queryFn: () => apiFetch<Array<{ id: string; code: string; name: string }>>('/farm/plots'),
    enabled: showBindPlot,
  });

  const bindPlotMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/members/${id}/plots`, { method: 'POST', body: JSON.stringify({ plotId: selectedPlotId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-plots', id] }); setShowBindPlot(false); setSelectedPlotId(''); },
  });

  const unbindPlotMutation = useMutation({
    mutationFn: (bindingId: string) => apiFetch(`/farm/members/${id}/plots/${bindingId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-plots', id] }),
  });

  const saveScheduleMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/members/${id}/schedule`, { method: 'PUT', body: JSON.stringify({ timeWaveConfig: schedule }) }),
  });

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', expired: 'bg-red-100 text-red-700' };

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Member Detail</h2>

      {member && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div><p className="text-xs text-[var(--muted-foreground)]">Nickname</p><p className="text-sm font-medium">{member.nickname}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Phone</p><p className="text-sm">{member.phone}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Status</p>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[member.status] || 'bg-gray-100 text-gray-700'}`}>{member.status}</span>
          </div>
          <div className="col-span-2"><p className="text-xs text-[var(--muted-foreground)]">Subscription</p><p className="text-sm">{new Date(member.subscriptionStart).toLocaleDateString()} - {new Date(member.subscriptionEnd).toLocaleDateString()}</p></div>
        </div>
      )}

      {/* Plot Bindings */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Plot Bindings</h3>
          <button onClick={() => setShowBindPlot(true)} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium">+ Bind to Plot</button>
        </div>
        {showBindPlot && (
          <div className="mb-4 p-3 border border-dashed border-[var(--border)] rounded-lg flex gap-2 items-end">
            <select value={selectedPlotId} onChange={(e) => setSelectedPlotId(e.target.value)} className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
              <option value="">Select plot...</option>
              {allPlots?.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
            <button onClick={() => bindPlotMutation.mutate()} disabled={!selectedPlotId} className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs disabled:opacity-50">Bind</button>
            <button onClick={() => setShowBindPlot(false)} className="px-3 py-2 border border-[var(--border)] rounded-lg text-xs">Cancel</button>
          </div>
        )}
        {bindings?.length ? (
          <ul className="space-y-2">
            {bindings.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm">{b.plotCode} - {b.plotName}</span>
                <button onClick={() => unbindPlotMutation.mutate(b.id)} className="text-xs text-red-500 hover:text-red-700">Unbind</button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-[var(--muted-foreground)]">No plots bound.</p>}
      </div>

      {/* Capture Schedule */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4">
        <h3 className="font-semibold mb-3">Capture Schedule (TimeWave Config)</h3>
        <textarea value={schedule} onChange={(e) => setSchedule(e.target.value)} rows={5}
          placeholder='[{"startTime":"06:00","endTime":"18:00","intervalMinutes":30}]'
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-mono mb-3" />
        <button onClick={() => saveScheduleMutation.mutate()} disabled={saveScheduleMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
          {saveScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
        </button>
        {saveScheduleMutation.isSuccess && <span className="ml-2 text-sm text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}
