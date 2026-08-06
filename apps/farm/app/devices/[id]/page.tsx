'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAddZone, setShowAddZone] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [polygonPoints, setPolygonPoints] = useState('');

  const { data: device } = useQuery({
    queryKey: ['device', id],
    queryFn: () => apiFetch<{ id: string; name: string; protocol: string; status: string; lastHeartbeat: string }>(`/farm/devices/${id}`),
  });

  const { data: zones } = useQuery({
    queryKey: ['device-zones', id],
    queryFn: () => apiFetch<Array<{ id: string; name: string; polygonPoints: number[][]; createdAt: string }>>(`/farm/devices/${id}/zones`),
  });

  const addZoneMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/devices/${id}/zones`, {
      method: 'POST',
      body: JSON.stringify({ name: zoneName, polygonPoints: JSON.parse(polygonPoints) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-zones', id] });
      setShowAddZone(false);
      setZoneName('');
      setPolygonPoints('');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => apiFetch(`/farm/devices/${id}/zones/${zoneId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device-zones', id] }),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Camera Detail</h2>

      {/* Camera Info */}
      {device && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[var(--muted-foreground)]">Name</p><p className="text-sm font-medium">{device.name}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Protocol</p><p className="text-sm font-medium">{device.protocol}</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Status</p>
            <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} /><span className="text-sm">{device.status}</span></div>
          </div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Last Heartbeat</p><p className="text-sm">{new Date(device.lastHeartbeat).toLocaleString()}</p></div>
        </div>
      )}

      {/* Coverage Zones */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Coverage Zones</h3>
          <button onClick={() => setShowAddZone(true)} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium">+ Add Zone</button>
        </div>

        {showAddZone && (
          <div className="mb-4 p-4 border border-dashed border-[var(--border)] rounded-lg space-y-3">
            <div><label className="block text-sm font-medium mb-1">Zone Name</label><input value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Polygon Points (JSON)</label>
              <textarea value={polygonPoints} onChange={(e) => setPolygonPoints(e.target.value)} placeholder='[[0,0],[100,0],[100,100],[0,100]]' className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm h-20 font-mono" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddZone(false)} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs">Cancel</button>
              <button onClick={() => addZoneMutation.mutate()} disabled={addZoneMutation.isPending} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs disabled:opacity-50">Save Zone</button>
            </div>
          </div>
        )}

        {zones?.length ? (
          <ul className="space-y-2">
            {zones.map((zone) => (
              <li key={zone.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{zone.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{zone.polygonPoints.length} points</p>
                </div>
                <button onClick={() => deleteZoneMutation.mutate(zone.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </li>
            ))}
          </ul>
        ) : !showAddZone && (
          <p className="text-sm text-[var(--muted-foreground)]">No zones defined. Add one to map camera coverage to plots.</p>
        )}
      </div>
    </div>
  );
}
