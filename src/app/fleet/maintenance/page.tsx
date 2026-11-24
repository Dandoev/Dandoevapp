'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Asset = { id: string; serialNumber: string; bike: { name: string } };
type Case = { id: string; title: string; description: string; status: string; resolution: string | null; createdAt: string; asset: { serialNumber: string; bike: { name: string } } };

export default function MaintenancePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [assetResponse, caseResponse] = await Promise.all([fetch('/api/admin/assets', { cache: 'no-store' }), fetch('/api/fleet/maintenance', { cache: 'no-store' })]);
      const [assetBody, caseBody] = await Promise.all([assetResponse.json(), caseResponse.json()]);
      if (!assetResponse.ok || !caseResponse.ok) throw new Error(caseBody.error || assetBody.error || 'Maintenance unavailable');
      setAssets(assetBody.data); setCases(caseBody.data); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Maintenance unavailable'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function send(method: 'POST' | 'PATCH', body: object) {
    setBusy(true);
    try {
      const response = await fetch('/api/fleet/maintenance', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 lg:p-10"><div className="mx-auto max-w-5xl space-y-6"><nav className="flex gap-5 text-sm text-teal-800"><Link href="/fleet">Overview</Link><Link href="/fleet/live">Live fleet</Link><Link href="/fleet/control">Fleet control</Link></nav><div><h1 className="text-3xl font-bold">Maintenance</h1><p className="mt-2 text-slate-600">Log work against a registered physical bike and record the resolution.</p></div>{error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
  <form className="grid gap-3 rounded-2xl border bg-white p-5" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void send('POST', { assetId: data.get('assetId'), title: data.get('title'), description: data.get('description') }).then(() => form.reset()); }}><h2 className="text-lg font-semibold">Open service case</h2><select name="assetId" required className="rounded-lg border p-3" defaultValue=""><option value="" disabled>Select bike</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.serialNumber} · {asset.bike.name}</option>)}</select><input name="title" required minLength={3} maxLength={120} placeholder="Issue title" className="rounded-lg border p-3"/><textarea name="description" required minLength={5} maxLength={2000} placeholder="Observed fault and work needed" className="rounded-lg border p-3"/><button disabled={busy} className="w-fit rounded-lg bg-teal-800 px-4 py-2 text-white disabled:opacity-50">Create case</button></form>
  <div className="space-y-3">{cases.map(item => <section key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{item.title}</h2><p className="text-sm text-slate-500">{item.asset.serialNumber} · {item.asset.bike.name} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="text-sm font-medium">{item.status.replace('_', ' ')}</span></div><p className="mt-3 text-sm">{item.description}</p>{item.resolution && <p className="mt-3 text-sm text-teal-800">Resolution: {item.resolution}</p>}{item.status !== 'closed' && <div className="mt-4 flex gap-3"><button disabled={busy || item.status === 'in_progress'} onClick={() => void send('PATCH', { id: item.id, status: 'in_progress' })} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Start work</button><button disabled={busy} onClick={() => { const resolution = window.prompt('Describe the completed repair or inspection (at least 5 characters):'); if (resolution?.trim() && resolution.trim().length >= 5) void send('PATCH', { id: item.id, status: 'closed', resolution: resolution.trim() }); }} className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white disabled:opacity-50">Close case</button></div>}</section>)}{cases.length === 0 && <p className="text-slate-500">No maintenance cases yet.</p>}</div></div></main>;
}
