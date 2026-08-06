'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function CommandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: command } = useQuery({
    queryKey: ['command', id],
    queryFn: () => apiFetch<{
      id: string; type: string; description: string; plotCode: string; plotName: string;
      memberName: string; status: string; createdAt: string; acceptedAt?: string;
      completedAt?: string; rejectedAt?: string; rejectReason?: string;
      receipts?: Array<{ id: string; imageUrl: string; text: string }>;
    }>(`/farm/commands/${id}`),
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/commands/${id}/accept`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['command', id] }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiFetch(`/farm/commands/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: rejectReason }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['command', id] }); setShowReject(false); },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = '';
      if (receiptFile) {
        const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>('/farm/upload/presign', {
          method: 'POST', body: JSON.stringify({ fileName: receiptFile.name, contentType: receiptFile.type }),
        });
        await fetch(uploadUrl, { method: 'PUT', body: receiptFile, headers: { 'Content-Type': receiptFile.type } });
        imageUrl = publicUrl;
      }
      return apiFetch(`/farm/commands/${id}/complete`, { method: 'POST', body: JSON.stringify({ text: receiptText, imageUrl }) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['command', id] }),
  });

  const statusTimeline = [
    { label: 'Created', time: command?.createdAt },
    { label: 'Accepted', time: command?.acceptedAt },
    { label: 'Completed', time: command?.completedAt },
    { label: 'Rejected', time: command?.rejectedAt },
  ].filter((s) => s.time);

  const typeColors: Record<string, string> = { irrigation: 'bg-blue-100 text-blue-700', fertilize: 'bg-green-100 text-green-700', harvest: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Command Detail</h2>

      {command && (
        <>
          <div className="bg-white rounded-lg border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[command.type] || 'bg-gray-100 text-gray-700'}`}>{command.type}</span>
              <span className="text-sm font-medium">{command.memberName}</span>
              <span className="text-xs text-[var(--muted-foreground)]">· {command.plotCode}</span>
            </div>
            {command.description && <p className="text-sm">{command.description}</p>}

            {/* Timeline */}
            <div className="flex gap-4 text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
              {statusTimeline.map((s) => (
                <div key={s.label}><span className="font-medium text-[var(--foreground)]">{s.label}</span><br />{new Date(s.time!).toLocaleString()}</div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {command.status === 'pending' && (
            <div className="bg-white rounded-lg border border-[var(--border)] p-4 space-y-3">
              <h3 className="font-semibold">Actions</h3>
              <div className="flex gap-2">
                <button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">Accept</button>
                <button onClick={() => setShowReject(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Reject</button>
              </div>
              {showReject && (
                <div className="space-y-2">
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" rows={3} />
                  <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Confirm Reject</button>
                </div>
              )}
            </div>
          )}

          {(command.status === 'accepted' || command.status === 'executing') && (
            <div className="bg-white rounded-lg border border-[var(--border)] p-4 space-y-3">
              <h3 className="font-semibold">Complete Command</h3>
              <div><label className="block text-sm font-medium mb-1">Receipt Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="text-sm" />
              </div>
              <div><label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={receiptText} onChange={(e) => setReceiptText(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" rows={2} />
              </div>
              <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
                {completeMutation.isPending ? 'Submitting...' : 'Mark Complete'}
              </button>
            </div>
          )}

          {/* Receipts */}
          {command.receipts?.length ? (
            <div className="bg-white rounded-lg border border-[var(--border)] p-4">
              <h3 className="font-semibold mb-3">Receipts</h3>
              <div className="space-y-3">
                {command.receipts.map((r) => (
                  <div key={r.id} className="flex gap-3 items-start">
                    {r.imageUrl && <img src={r.imageUrl} alt="receipt" className="w-20 h-20 object-cover rounded-lg border" />}
                    {r.text && <p className="text-sm">{r.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
