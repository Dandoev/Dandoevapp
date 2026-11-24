'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Asset = { id: string; serialNumber: string; status: string; imei: string | null; unlockBlockedAt: string | null; unlockBlockReason: string | null; bike: { name: string }; position: { latitude: number; longitude: number; ageSeconds: number; estimated: boolean } | null; telemetry: { lockState: string; batteryPercent: number | null; signal: number | null; ageSeconds: number } | null; commands: Array<{ id: string; operation: string; status: string; requestedAt: string; resultMessage: string | null }> };

export default function LiveFleetPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/fleet/live', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Fleet data unavailable');
      setAssets(body.data);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Fleet data unavailable'); }
  }, []);
  useEffect(() => { void load(); const interval = setInterval(() => void load(), 15000); return () => clearInterval(interval); }, [load]);
  async function setAccess(asset: Asset) {
    const blocked = !asset.unlockBlockedAt;
    const reason = blocked ? window.prompt(`Reason for blocking rider unlock on ${asset.serialNumber} (at least 5 characters):`) : null;
    if (blocked && (reason === null || reason.trim().length < 5)) return;
    if (!blocked && !window.confirm(`Restore rider unlock access for ${asset.serialNumber}?`)) return;
    setSaving(asset.id);
    try {
      const response = await fetch(`/api/admin/vehicles/${asset.id}/access`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocked, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Access update failed');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Access update failed'); }
    finally { setSaving(null); }
  }
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900 lg:p-10"><div className="mx-auto max-w-7xl space-y-6">
    <nav className="flex flex-wrap gap-5 text-sm text-teal-800"><Link href="/fleet">Overview</Link><Link href="/fleet/control">Fleet control</Link><Link href="/fleet/swap">Battery swaps</Link></nav>
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Live fleet</h1><p className="mt-2 text-slate-600">Device positions, battery and lock reports refresh every 15 seconds.</p></div><button onClick={() => void load()} className="rounded-lg border bg-white px-4 py-2">Refresh</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2">{assets.map(asset => {
      const freshPosition = asset.position && asset.position.ageSeconds <= 120;
      const freshTelemetry = asset.telemetry && asset.telemetry.ageSeconds <= 120;
      return <section key={asset.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="text-xl font-semibold">{asset.bike.name}</h2><p className="text-sm text-slate-500">{asset.serialNumber} · {asset.status}</p></div><span className="text-sm font-semibold">{freshTelemetry ? 'Online' : 'Offline / stale'}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div>Battery: <b>{freshTelemetry && asset.telemetry?.batteryPercent != null ? `${asset.telemetry.batteryPercent}%` : 'Unavailable'}</b></div><div>Lock: <b>{freshTelemetry ? asset.telemetry?.lockState : 'Unverified'}</b></div><div>Signal: <b>{freshTelemetry ? asset.telemetry?.signal ?? 'Unavailable' : 'Unavailable'}</b></div><div>Access: <b>{asset.unlockBlockedAt ? 'Blocked' : 'Allowed'}</b></div></div>
        <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm">{freshPosition ? <><p>Device GPS: {asset.position?.latitude}, {asset.position?.longitude}{asset.position?.estimated ? ' (estimated)' : ''}</p><a className="mt-2 inline-block text-teal-800 underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${asset.position?.latitude},${asset.position?.longitude}`}>Open live position on map</a></> : <p>Live location unavailable{asset.position ? ` · last report ${asset.position.ageSeconds}s ago` : ''}</p>}</div>
        {asset.unlockBlockedAt && <p className="mt-3 text-sm text-amber-800">Security hold: {asset.unlockBlockReason || 'Reason unavailable'}</p>}
        <button disabled={saving === asset.id} onClick={() => void setAccess(asset)} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">{asset.unlockBlockedAt ? 'Restore rider unlock' : 'Block rider unlock'}</button>
        <h3 className="mt-5 font-semibold">Recent commands</h3><div className="mt-2 space-y-1 text-sm">{asset.commands.length ? asset.commands.map(command => <p key={command.id}>{command.operation} · {command.status} · {new Date(command.requestedAt).toLocaleString()}{command.resultMessage ? ` · ${command.resultMessage}` : ''}</p>) : <p className="text-slate-500">No commands recorded.</p>}</div>
        <p className="mt-4 text-xs text-slate-500">Remote lock stays blocked until verified stationary state is available from the bike firmware.</p>
      </section>;
    })}</div>{!assets.length && !error && <p>No physical bikes registered yet.</p>}</div></main>;
}
