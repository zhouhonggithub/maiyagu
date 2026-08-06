'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function PublishContentPage() {
  const router = useRouter();
  const [plotId, setPlotId] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [logDate, setLogDate] = useState('');
  const [logTitle, setLogTitle] = useState('');
  const [logContent, setLogContent] = useState('');
  const [logEventType, setLogEventType] = useState('growth');

  const { data: plots } = useQuery({
    queryKey: ['all-plots'],
    queryFn: () => apiFetch<Array<{ id: string; code: string; name: string }>>('/farm/plots'),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl = '';
      if (file) {
        const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>('/farm/upload/presign', {
          method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        mediaUrl = publicUrl;
      }
      return apiFetch('/farm/content', {
        method: 'POST',
        body: JSON.stringify({
          plotId, mediaType, mediaUrl, caption,
          growthLog: logTitle ? { date: logDate, title: logTitle, content: logContent, eventType: logEventType } : undefined,
        }),
      });
    },
    onSuccess: () => router.push('/content'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    publishMutation.mutate();
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Publish Content</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[var(--border)] p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Plot</label>
          <select value={plotId} onChange={(e) => setPlotId(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
            <option value="">Select plot...</option>
            {plots?.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <div className="flex gap-3">
            {(['photo', 'video'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="mediaType" checked={mediaType === t} onChange={() => setMediaType(t)} />
                <span className="text-sm capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">File</label>
          <input type="file" accept={mediaType === 'photo' ? 'image/*' : 'video/*'} onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
        </div>

        {/* Growth Log Section */}
        <div className="pt-4 border-t border-[var(--border)]">
          <h4 className="text-sm font-semibold mb-3">Growth Log (optional)</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium mb-1">Date</label><input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium mb-1">Event Type</label>
                <select value={logEventType} onChange={(e) => setLogEventType(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                  <option value="planting">Planting</option><option value="growth">Growth</option><option value="harvest">Harvest</option><option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div><label className="block text-xs font-medium mb-1">Title</label><input value={logTitle} onChange={(e) => setLogTitle(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Content</label><textarea value={logContent} onChange={(e) => setLogContent(e.target.value)} rows={3} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
          </div>
        </div>

        <button type="submit" disabled={publishMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
          {publishMutation.isPending ? 'Publishing...' : 'Publish'}
        </button>
        {publishMutation.isError && <p className="text-sm text-red-600">Failed to publish. Please try again.</p>}
      </form>
    </div>
  );
}
