'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function PlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showBindModal, setShowBindModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { data: plot } = useQuery({
    queryKey: ['plot', id],
    queryFn: () => apiFetch<{
      id: string; name: string; code: string; status: string; area: number;
      soilType: string; irrigationType: string; currentCrop: string;
    }>(`/farm/plots/${id}`),
  });

  const { data: boundMembers } = useQuery({
    queryKey: ['plot-members', id],
    queryFn: () => apiFetch<Array<{ id: string; nickname: string; phone: string }>>(`/farm/plots/${id}/members`),
  });

  const { data: analyses } = useQuery({
    queryKey: ['plot-analyses', id],
    queryFn: () => apiFetch<Array<{ id: string; healthScore: number; growthStage: string; analyzedAt: string }>>(`/farm/plots/${id}/analyses`),
  });

  const { data: allMembers } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => apiFetch<Array<{ id: string; nickname: string }>>('/farm/members'),
    enabled: showBindModal,
  });

  const bindMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/plots/${id}/members`, { method: 'POST', body: JSON.stringify({ memberId: selectedMemberId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plot-members', id] }); setShowBindModal(false); setSelectedMemberId(''); },
  });

  const unbindMutation = useMutation({
    mutationFn: (memberId: string) => apiFetch(`/farm/plots/${id}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plot-members', id] }),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Plot Detail</h2>

      {plot && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div><p className="text-xs text-[var(--muted-foreground)]">Name</p><p className="text-sm font-medium">{plot.name}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Code</p><p className="text-sm font-medium">{plot.code}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Status</p><p className="text-sm font-medium">{plot.status}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Area</p><p className="text-sm">{plot.area ?? '-'} m²</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Soil Type</p><p className="text-sm">{plot.soilType || '-'}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Irrigation</p><p className="text-sm">{plot.irrigationType || '-'}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Current Crop</p><p className="text-sm">{plot.currentCrop || '-'}</p></div>
        </div>
      )}

      {/* Bound Members */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Bound Members</h3>
          <button onClick={() => setShowBindModal(true)} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium">+ Bind Member</button>
        </div>
        {showBindModal && (
          <div className="mb-4 p-3 border border-dashed border-[var(--border)] rounded-lg flex gap-2 items-end">
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
              <option value="">Select member...</option>
              {allMembers?.map((m) => <option key={m.id} value={m.id}>{m.nickname}</option>)}
            </select>
            <button onClick={() => bindMutation.mutate()} disabled={!selectedMemberId || bindMutation.isPending} className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs disabled:opacity-50">Bind</button>
            <button onClick={() => setShowBindModal(false)} className="px-3 py-2 border border-[var(--border)] rounded-lg text-xs">Cancel</button>
          </div>
        )}
        {boundMembers?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[var(--muted-foreground)]"><th className="pb-2">Nickname</th><th className="pb-2">Phone</th><th className="pb-2"></th></tr></thead>
            <tbody>
              {boundMembers.map((m) => (
                <tr key={m.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{m.nickname}</td>
                  <td className="py-2">{m.phone}</td>
                  <td className="py-2 text-right"><button onClick={() => unbindMutation.mutate(m.id)} className="text-xs text-red-500 hover:text-red-700">Unbind</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-[var(--muted-foreground)]">No members bound to this plot.</p>}
      </div>

      {/* Analysis History */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4">
        <h3 className="font-semibold mb-3">Analysis History</h3>
        {analyses?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[var(--muted-foreground)]"><th className="pb-2">Date</th><th className="pb-2">Health</th><th className="pb-2">Growth Stage</th></tr></thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{new Date(a.analyzedAt).toLocaleDateString()}</td>
                  <td className="py-2"><span className="font-medium">{a.healthScore}%</span></td>
                  <td className="py-2">{a.growthStage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-[var(--muted-foreground)]">No analysis data yet.</p>}
      </div>
    </div>
  );
}
