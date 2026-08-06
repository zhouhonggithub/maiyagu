'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';

type Protocol = 'ezviz' | 'rtsp' | 'custom';

export default function AddDevicePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [protocol, setProtocol] = useState<Protocol>('ezviz');
  const [name, setName] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');

  const testMutation = useMutation({
    mutationFn: () => apiFetch('/farm/devices/test-connection', { method: 'POST', body: JSON.stringify(getCredentials()) }),
    onSuccess: () => setTestResult('success'),
    onError: () => setTestResult('fail'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch('/farm/devices', { method: 'POST', body: JSON.stringify({ name, protocol, ...getCredentials() }) }),
    onSuccess: () => router.push('/devices'),
  });

  function getCredentials() {
    if (protocol === 'ezviz') return { appKey, appSecret, deviceSerial };
    if (protocol === 'rtsp') return { rtspUrl };
    return { customUrl };
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Add Camera</h2>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center gap-1 ${step >= s ? 'text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)]'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= s ? 'bg-[var(--primary)] text-white' : 'bg-gray-200'}`}>{s}</span>
            <span>{s === 1 ? 'Protocol' : s === 2 ? 'Credentials' : 'Test'}</span>
            {s < 3 && <span className="mx-2 text-gray-300">→</span>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] p-6">
        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium mb-1">Camera Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North Plot Camera" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
            <label className="block text-sm font-medium mb-1">Select Protocol</label>
            <div className="space-y-2">
              {(['ezviz', 'rtsp', 'custom'] as Protocol[]).map((p) => (
                <label key={p} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="protocol" checked={protocol === p} onChange={() => setProtocol(p)} />
                  <span className="text-sm font-medium capitalize">{p === 'ezviz' ? 'Ezviz Cloud' : p === 'rtsp' ? 'RTSP' : 'Custom URL'}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!name} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {protocol === 'ezviz' && (
              <>
                <div><label className="block text-sm font-medium mb-1">App Key</label><input value={appKey} onChange={(e) => setAppKey(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">App Secret</label><input value={appSecret} onChange={(e) => setAppSecret(e.target.value)} type="password" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Device Serial</label><input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              </>
            )}
            {protocol === 'rtsp' && (
              <div><label className="block text-sm font-medium mb-1">RTSP URL</label><input value={rtspUrl} onChange={(e) => setRtspUrl(e.target.value)} placeholder="rtsp://..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            )}
            {protocol === 'custom' && (
              <div><label className="block text-sm font-medium mb-1">Custom URL</label><input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm">Back</button>
              <button onClick={() => { setStep(3); setTestResult('idle'); }} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">Test your camera connection before saving.</p>
            <button onClick={() => { setTestResult('testing'); testMutation.mutate(); }} disabled={testResult === 'testing'} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm">
              {testResult === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult === 'success' && <p className="text-sm text-green-600 font-medium">✓ Connection successful!</p>}
            {testResult === 'fail' && <p className="text-sm text-red-600 font-medium">✗ Connection failed. Check credentials.</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm">Back</button>
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm disabled:opacity-50">
                {createMutation.isPending ? 'Saving...' : 'Save Camera'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
