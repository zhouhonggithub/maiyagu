'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function SettingsPage() {
  const [schedule, setSchedule] = useState('');

  const { data: farm } = useQuery({
    queryKey: ['farm-settings'],
    queryFn: () => apiFetch<{ name: string; location: string; province: string; city: string; defaultSchedule: string }>('/farm/settings'),
  });

  useEffect(() => {
    if (farm?.defaultSchedule && !schedule) {
      setSchedule(farm.defaultSchedule);
    }
  }, [farm?.defaultSchedule]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch('/farm/settings/schedule', {
      method: 'PUT',
      body: JSON.stringify({ defaultSchedule: schedule }),
    }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Farm configuration and default schedules</p>
      </div>

      {/* Farm Profile */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-6">
        <h3 className="font-semibold mb-4">Farm Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Farm Name</label>
            <p className="text-sm font-medium">{farm?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Location</label>
            <p className="text-sm">{farm?.province} {farm?.city}</p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Address</label>
            <p className="text-sm">{farm?.location || '-'}</p>
          </div>
        </div>
      </div>

      {/* Default Capture Schedule */}
      <div className="bg-white rounded-lg border border-[var(--border)] p-6">
        <h3 className="font-semibold mb-2">Default Capture Schedule</h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          TimeWave config applied to new members by default. JSON format with time ranges and intervals.
        </p>
        <textarea
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          rows={6}
          placeholder='[{"startTime":"06:00","endTime":"18:00","intervalMinutes":30}]'
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-mono mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Schedule'}
          </button>
          {saveMutation.isSuccess && <span className="text-sm text-green-600">✓ Saved successfully</span>}
          {saveMutation.isError && <span className="text-sm text-red-600">Failed to save</span>}
        </div>
      </div>
    </div>
  );
}
