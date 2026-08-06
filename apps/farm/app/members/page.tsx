'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function MembersPage() {
  const router = useRouter();

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => apiFetch<Array<{
      id: string; nickname: string; phone: string; subscriptionStart: string;
      subscriptionEnd: string; status: string; boundPlotsCount: number;
    }>>('/farm/members'),
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  function maskPhone(phone: string) {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage subscription members and plot bindings</p>
        </div>
        <button onClick={() => router.push('/members/add')} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">+ Add Member</button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading members...</p>
      ) : members?.length ? (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-3">Nickname</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plots</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} onClick={() => router.push(`/members/${m.id}`)} className="border-t border-[var(--border)] cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.nickname}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{maskPhone(m.phone)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {new Date(m.subscriptionStart).toLocaleDateString()} - {new Date(m.subscriptionEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[m.status] || 'bg-gray-100 text-gray-700'}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">{m.boundPlotsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No members yet</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Add your first member to get started.</p>
        </div>
      )}
    </div>
  );
}
