'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function AddMemberPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [subscriptionStart, setSubscriptionStart] = useState('');
  const [subscriptionEnd, setSubscriptionEnd] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: () => apiFetch('/farm/members', {
      method: 'POST',
      body: JSON.stringify({ nickname, phone, subscriptionStart, subscriptionEnd, notes }),
    }),
    onSuccess: () => router.push('/members'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Add Member</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[var(--border)] p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="13800138000" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subscription Start</label>
            <input type="date" value={subscriptionStart} onChange={(e) => setSubscriptionStart(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subscription End</label>
            <input type="date" value={subscriptionEnd} onChange={(e) => setSubscriptionEnd(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
        </div>
        <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
          {createMutation.isPending ? 'Creating...' : 'Create Member'}
        </button>
        {createMutation.isError && <p className="text-sm text-red-600">Failed to create member. Please try again.</p>}
      </form>
    </div>
  );
}
