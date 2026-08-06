'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

export default function CreatePlotPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'freeform' | 'grid'>('freeform');

  // Freeform fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [polygonPoints, setPolygonPoints] = useState('');
  const [coverageZoneId, setCoverageZoneId] = useState('');
  const [soilType, setSoilType] = useState('');
  const [irrigationType, setIrrigationType] = useState('');

  // Grid fields
  const [gridZoneId, setGridZoneId] = useState('');
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  const { data: zones } = useQuery({
    queryKey: ['all-zones'],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>('/farm/coverage-zones'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiFetch('/farm/plots', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => router.push('/plots'),
  });

  const gridCodes = () => {
    const result: string[] = [];
    for (let r = 0; r < Math.min(rows, 26); r++) {
      for (let c = 1; c <= Math.min(cols, 99); c++) {
        result.push(`${String.fromCharCode(65 + r)}${c}`);
      }
    }
    return result;
  };

  function handleSubmitFreeform(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      mode: 'freeform', name, code,
      polygonPoints: polygonPoints ? JSON.parse(polygonPoints) : [],
      coverageZoneId: coverageZoneId || undefined, soilType, irrigationType,
    });
  }

  function handleSubmitGrid(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ mode: 'grid', coverageZoneId: gridZoneId, rows, cols });
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Create Plot</h2>

      <div className="flex gap-2">
        <button onClick={() => setTab('freeform')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'freeform' ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600'}`}>Freeform</button>
        <button onClick={() => setTab('grid')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'grid' ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-600'}`}>Grid Split</button>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] p-6">
        {tab === 'freeform' ? (
          <form onSubmit={handleSubmitFreeform} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Code</label><input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. A1" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Polygon Points (JSON)</label>
              <textarea value={polygonPoints} onChange={(e) => setPolygonPoints(e.target.value)} placeholder='[[0,0],[10,0],[10,10],[0,10]]' className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm h-20 font-mono" />
            </div>
            <div><label className="block text-sm font-medium mb-1">Coverage Zone</label>
              <select value={coverageZoneId} onChange={(e) => setCoverageZoneId(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                <option value="">None</option>
                {zones?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Soil Type</label><input value={soilType} onChange={(e) => setSoilType(e.target.value)} placeholder="e.g. loam" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Irrigation</label><input value={irrigationType} onChange={(e) => setIrrigationType(e.target.value)} placeholder="e.g. drip" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            </div>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Plot'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitGrid} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Coverage Zone</label>
              <select value={gridZoneId} onChange={(e) => setGridZoneId(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                <option value="">Select zone...</option>
                {zones?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Rows (1-26)</label><input type="number" min={1} max={26} value={rows} onChange={(e) => setRows(Number(e.target.value))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Cols (1-99)</label><input type="number" min={1} max={99} value={cols} onChange={(e) => setCols(Number(e.target.value))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-[var(--muted-foreground)] mb-2">Preview: {rows * cols} plots</p>
              <div className="flex flex-wrap gap-1">{gridCodes().slice(0, 20).map((c) => <span key={c} className="px-2 py-0.5 bg-white border border-[var(--border)] rounded text-xs">{c}</span>)}
                {rows * cols > 20 && <span className="text-xs text-[var(--muted-foreground)]">...and {rows * cols - 20} more</span>}
              </div>
            </div>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Grid Plots'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
