'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

type ContentTab = 'media' | 'logs';

const eventTypeColors: Record<string, string> = {
  planting: 'bg-green-100 text-green-700',
  growth: 'bg-blue-100 text-blue-700',
  harvest: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-gray-100 text-gray-700',
};

export default function ContentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ContentTab>('media');

  const { data: media } = useQuery({
    queryKey: ['media'],
    queryFn: () => apiFetch<Array<{
      id: string; url: string; plotCode: string; caption: string; createdAt: string; type: string;
    }>>('/farm/media'),
    enabled: tab === 'media',
  });

  const { data: logs } = useQuery({
    queryKey: ['growth-logs'],
    queryFn: () => apiFetch<Array<{
      id: string; title: string; content: string; eventType: string; date: string;
      media?: Array<{ id: string; url: string }>;
    }>>('/farm/growth-logs'),
    enabled: tab === 'logs',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content & Growth Logs</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Media gallery and growth timeline</p>
        </div>
        <button onClick={() => router.push('/content/publish')} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">+ Publish Content</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('media')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'media' ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600'}`}>Media Gallery</button>
        <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'logs' ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600'}`}>Growth Logs</button>
      </div>

      {tab === 'media' && (
        media?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <div key={item.id} className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="aspect-square bg-gray-100 relative">
                  <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">{item.plotCode}</span>
                </div>
                <div className="p-2">
                  <p className="text-xs text-[var(--muted-foreground)]">{new Date(item.createdAt).toLocaleDateString()}</p>
                  {item.caption && <p className="text-xs truncate mt-0.5">{item.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
            <div className="text-4xl mb-4">🖼️</div>
            <h3 className="text-lg font-semibold mb-2">No media yet</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Publish content to build your gallery.</p>
          </div>
        )
      )}

      {tab === 'logs' && (
        logs?.length ? (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--muted-foreground)]">{new Date(log.date).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${eventTypeColors[log.eventType] || 'bg-gray-100 text-gray-700'}`}>{log.eventType}</span>
                </div>
                <h4 className="font-medium text-sm mb-1">{log.title}</h4>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{log.content}</p>
                {log.media?.length ? (
                  <div className="flex gap-2 mt-2">
                    {log.media.slice(0, 4).map((m) => (
                      <img key={m.id} src={m.url} alt="" className="w-12 h-12 object-cover rounded border" />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">No growth logs yet</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Publish content with growth log data to start your timeline.</p>
          </div>
        )
      )}
    </div>
  );
}
