'use client';

import Link from 'next/link';
import { Activity, ArrowRight, BatteryCharging, Bike, MapPinned, ShieldCheck, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const modules = [
  { href: '/admin/fleet-control', title: 'Fleet control', description: 'Physical assets, rider assignments, BNPL context and recovery queue.', icon: Bike, status: 'Available' },
  { href: '/admin/fleet-control#stations', title: 'Swap stations', description: 'Create stations, manage availability and publish rider destinations.', icon: BatteryCharging, status: 'Available' },
  { href: '/admin/fleet-control#tracking', title: 'Live tracking', description: 'OMNI device positions, freshness and connectivity status.', icon: MapPinned, status: 'Gateway pending' },
  { href: '/admin/fleet-control#security', title: 'Security controls', description: 'Alerts, lock policy, theft workflow and command audit trail.', icon: ShieldCheck, status: 'Hardware validation pending' },
  { href: '/admin/fleet-control#maintenance', title: 'Maintenance', description: 'Faults, mileage reminders, service records and workshop operations.', icon: Wrench, status: 'Planned' },
  { href: '/admin/fleet-control#telemetry', title: 'Telemetry', description: 'Speed, battery, ride sessions and fleet utilization analytics.', icon: Activity, status: 'Gateway pending' },
];

export default function EbikeOperationsDashboard() {
  return <main className="min-h-screen bg-[#071638] text-white">
    <header className="border-b border-white/10 bg-[#0A1B46]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/admin/ebike" className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-white p-1"><img src="/logo.png" alt="DandoEv" className="size-full object-contain" /></div><div><div className="text-lg font-bold">DandoEv eBike Operations</div><div className="text-xs text-[#8DC5E4]">Connected mobility control centre</div></div></Link>
        <div className="flex items-center gap-3"><Badge className="border border-amber-300/30 bg-amber-400/10 text-amber-200">Pilot environment</Badge><Link href="/admin" className="text-sm text-[#A9D8EF] hover:text-white">DandoEv Admin →</Link></div>
      </div>
    </header>
    <section className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#55C5F3]">Bike operations</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Connected fleet dashboard</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">This workspace is dedicated to physical DandoEv bikes, OMNI device telemetry, rider access, security, maintenance and swap-station operations. Commerce, BNPL and customer approvals remain in the DandoEv Admin workspace.</p></div>
      <div className="grid gap-4 md:grid-cols-3"><Card className="border-white/10 bg-white/5 text-white"><CardHeader><CardDescription className="text-slate-400">Connected assets</CardDescription><CardTitle className="text-3xl">—</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-400">Available after migration and device registration.</p></CardContent></Card><Card className="border-white/10 bg-white/5 text-white"><CardHeader><CardDescription className="text-slate-400">Live device positions</CardDescription><CardTitle className="text-3xl">—</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-400">Requires OMNI gateway ingestion.</p></CardContent></Card><Card className="border-white/10 bg-white/5 text-white"><CardHeader><CardDescription className="text-slate-400">Active security holds</CardDescription><CardTitle className="text-3xl">—</CardTitle></CardHeader><CardContent><p className="text-xs text-slate-400">Policy and hardware capability pending.</p></CardContent></Card></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{modules.map(module=>{const Icon=module.icon;return <Link key={module.href+module.title} href={module.href}><Card className="h-full border-white/10 bg-white/[0.06] text-white transition hover:border-[#55C5F3]/60 hover:bg-white/10"><CardHeader><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-[#36B9EF]/15 text-[#55C5F3]"><Icon className="size-5"/></div><Badge variant="outline" className="border-white/15 text-slate-300">{module.status}</Badge></div><CardTitle className="mt-4 text-lg">{module.title}</CardTitle><CardDescription className="text-slate-400">{module.description}</CardDescription></CardHeader><CardContent><span className="inline-flex items-center gap-2 text-sm font-semibold text-[#8EE0FF]">Open module <ArrowRight className="size-4"/></span></CardContent></Card></Link>})}</div>
    </section>
  </main>;
}
