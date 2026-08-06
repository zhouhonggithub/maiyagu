'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const protocolColors: Record<string, string> = {
  ezviz: 'bg-blue-100 text-blue-700',
  rtsp: 'bg-purple-100 text-purple-700',
  custom: 'bg-gray-100 text-gray-700',
};

export default function DevicesPage() {
  const router = useRouter();
  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiFetch<Array<{ id: string; name: string; protocol: string; status: string; lastHeartbeat: string }>>('/farm/devices'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Devices</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage cameras connected to your farm</p>
        </div>
        <button
          onClick={() => router.push('/devices/add')}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Camera
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--muted-foreground)]">Loading devices...</div>
      ) : devices?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              onClick={() => router.push(`/devices/${device.id}`)}
              className="bg-white rounded-lg border border-[var(--border)] p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{device.name}</h4>
                <span className={`w-2.5 h-2.5 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-400'}`} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${protocolColors[device.protocol] || 'bg-gray-100 text-gray-700'}`}>
                  {device.protocol}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{device.status}</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Last heartbeat: {timeAgo(device.lastHeartbeat)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-4">📷</div>
          <h3 className="text-lg font-semibold mb-2">No devices connected</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Add your first camera to start monitoring.</p>
        </div>
      )}
    </div>
  );
}
