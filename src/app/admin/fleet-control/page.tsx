'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Bike, BatteryCharging, CreditCard, MapPin, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

type BikeRecord = { id:string; name:string; model?:string|null; availability:string; stockQuantity:number; bnplEligible:boolean };
type Delinquency = { count:number; totalAtRisk:number; repayments:Array<{id:string;loanId:string;bikeName?:string;daysOverdue:number;amount:number}> };
type Recovery = { id:string; status:string; stage:string; assignedOfficer?:string|null; loan?:{ bike?:{name:string}; user?:{firstName:string;lastName:string} } };
type Asset = {id:string;serialNumber:string;status:string;bike:{name:string};assignments:Array<{riderId:string}>};
type Station = {id:string;name:string;address:string;availableBatteries:number;enabled:boolean};

export default function FleetControlPage() {
  const [bikes,setBikes]=useState<BikeRecord[]>([]);
  const [delinquent,setDelinquent]=useState<Delinquency|null>(null);
  const [cases,setCases]=useState<Recovery[]>([]);
  const [assets,setAssets]=useState<Asset[]>([]);
  const [stations,setStations]=useState<Station[]>([]);
  const [actionError,setActionError]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const urls=['/api/admin/bikes','/api/admin/loans/delinquent','/api/admin/recovery/cases?limit=20'];
    try {
      const results=await Promise.all(urls.map(url=>fetch(url,{cache:'no-store'})));
      if(results.some(r=>!r.ok)) throw new Error('A fleet, BNPL, or recovery source is unavailable or access is restricted.');
      const [fleet,risk,recovery]=await Promise.all(results.map(r=>r.json()));
      setBikes(Array.isArray(fleet)?fleet:[]);
      setDelinquent(risk.data ?? null);
      setCases(Array.isArray(recovery.data)?recovery.data:[]);
      const connected=await Promise.allSettled(['/api/admin/assets','/api/admin/stations'].map(async url=>{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('Connected fleet records unavailable');return response.json();}));
      setAssets(connected[0].status==='fulfilled'&&Array.isArray(connected[0].value.data)?connected[0].value.data:[]);
      setStations(connected[1].status==='fulfilled'&&Array.isArray(connected[1].value.data)?connected[1].value.data:[]);
      if(connected.some(item=>item.status==='rejected'))setError('Connected fleet records are unavailable. Apply the pending migration before managing assets and stations.');
    } catch(e){setError(e instanceof Error?e.message:'Unable to load fleet control data.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function submit(url:string,method:string,body:unknown){
    setBusy(true);setActionError('');
    try{const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Save failed');await load();}
    catch(e){setActionError(e instanceof Error?e.message:'Save failed');}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-9">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/admin/ebike" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-800"><ArrowLeft className="size-4"/> eBike Operations</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Fleet control</h1><p className="mt-1 text-sm text-slate-600">Connected-bike assets, stations and operations context.</p></div><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="mr-2 size-4"/> Refresh</Button></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {actionError&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>Bike catalogue units</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><Bike className="size-6 text-indigo-700"/>{bikes.reduce((n,b)=>n+(b.stockQuantity||0),0)}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Overdue repayments</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><CreditCard className="size-6 text-amber-600"/>{delinquent?.count??'—'}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Recovery cases shown</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><ShieldAlert className="size-6 text-rose-600"/>{cases.length}</CardTitle></CardHeader></Card></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5"/> Control status</CardTitle><CardDescription>OMNI v1.4.8 does not document a persistent debt or theft inhibit. Device telemetry, live location, and remote lock commands need the authenticated policy engine and gateway. No command is issued from this page.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Badge variant="outline">Hardware control pending</Badge><Badge variant="outline">Tracking unavailable</Badge><Link href="/admin" className="text-sm text-indigo-700 underline">Manage existing assignments and approvals</Link></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Fleet & assignment</CardTitle><CardDescription>Shared catalogue. Assignment remains in the existing admin workflow.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Bike</TableHead><TableHead>Stock</TableHead><TableHead>BNPL</TableHead></TableRow></TableHeader><TableBody>{bikes.map(b=><TableRow key={b.id}><TableCell>{b.name}<span className="block text-xs text-slate-500">{b.model}</span></TableCell><TableCell>{b.stockQuantity}</TableCell><TableCell>{b.bnplEligible?'Eligible':'No'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle>Overdue BNPL</CardTitle><CardDescription>Live repayment records; overdue status alone never triggers a bike lock.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Bike</TableHead><TableHead>Days overdue</TableHead><TableHead>Loan</TableHead></TableRow></TableHeader><TableBody>{delinquent?.repayments.slice(0,12).map(x=><TableRow key={x.id}><TableCell>{x.bikeName||'Unassigned'}</TableCell><TableCell>{x.daysOverdue}</TableCell><TableCell className="font-mono text-xs">{x.loanId.slice(0,8)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Recovery queue</CardTitle><CardDescription>Cases and officers from the existing recovery service.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rider</TableHead><TableHead>Bike</TableHead><TableHead>Stage</TableHead><TableHead>Officer</TableHead></TableRow></TableHeader><TableBody>{cases.map(c=><TableRow key={c.id}><TableCell>{c.loan?.user?`${c.loan.user.firstName} ${c.loan.user.lastName}`:'—'}</TableCell><TableCell>{c.loan?.bike?.name||'—'}</TableCell><TableCell><Badge variant="outline">{c.stage}</Badge></TableCell><TableCell>{c.assignedOfficer||'Unassigned'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bike className="size-5"/> Registered bike assets</CardTitle><CardDescription>Each physical bike has a serial number. Assignments link an asset to an existing rider and optional matching loan or order.</CardDescription></CardHeader><CardContent className="space-y-4"><form className="grid gap-2 md:grid-cols-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void submit('/api/admin/assets','POST',{bikeId:f.get('bikeId'),serialNumber:f.get('serialNumber')});e.currentTarget.reset();}}><select name="bikeId" required className="rounded-md border p-2 text-sm"><option value="">Select bike model</option>{bikes.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><Input name="serialNumber" placeholder="Serial number" required/><Button disabled={busy}>Register asset</Button></form><Table><TableHeader><TableRow><TableHead>Serial</TableHead><TableHead>Model</TableHead><TableHead>Rider</TableHead><TableHead>Assignment</TableHead></TableRow></TableHeader><TableBody>{assets.map(a=><TableRow key={a.id}><TableCell>{a.serialNumber}</TableCell><TableCell>{a.bike.name}</TableCell><TableCell>{a.assignments[0]?.riderId||'Unassigned'}</TableCell><TableCell>{a.assignments.length===0?<form className="flex gap-2" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void submit(`/api/admin/assets/${a.id}/assignment`,'POST',{riderId:f.get('riderId')});}}><Input name="riderId" aria-label={`Rider ID for ${a.serialNumber}`} placeholder="Rider UUID" required/><Button size="sm" disabled={busy}>Assign</Button></form>:<Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(window.confirm(`End the current assignment for ${a.serialNumber}?`))void submit(`/api/admin/assets/${a.id}/assignment/end`,'POST',{});}}>End assignment</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-5"/> Swap stations</CardTitle><CardDescription>Enabled stations appear in the rider app after the database migration and API URL configuration.</CardDescription></CardHeader><CardContent className="space-y-4"><form className="grid gap-2 md:grid-cols-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void submit('/api/admin/stations','POST',{name:f.get('name'),address:f.get('address'),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),hours:f.get('hours'),batteryTypes:String(f.get('batteryTypes')).split(',').map(x=>x.trim()).filter(Boolean),availableBatteries:Number(f.get('availableBatteries')),enabled:false});e.currentTarget.reset();}}><Input name="name" placeholder="Station name" required/><Input name="address" placeholder="Address" required/><Input name="latitude" type="number" step="any" placeholder="Latitude" required/><Input name="longitude" type="number" step="any" placeholder="Longitude" required/><Input name="hours" placeholder="Hours, e.g. 08:00–18:00" required/><Input name="batteryTypes" placeholder="Battery types, comma separated" required/><Input name="availableBatteries" type="number" min="0" placeholder="Available batteries" required/><Button disabled={busy}>Add station</Button></form><Table><TableHeader><TableRow><TableHead>Station</TableHead><TableHead>Batteries</TableHead><TableHead>Status</TableHead><TableHead>Publish</TableHead></TableRow></TableHeader><TableBody>{stations.map(s=><TableRow key={s.id}><TableCell>{s.name}<span className="block text-xs text-slate-500">{s.address}</span></TableCell><TableCell>{s.availableBatteries}</TableCell><TableCell><Badge variant="outline">{s.enabled?'Visible':'Hidden'}</Badge></TableCell><TableCell><Button size="sm" variant="outline" disabled={busy} onClick={()=>void submit(`/api/admin/stations/${s.id}`,'PATCH',{enabled:!s.enabled})}>{s.enabled?'Hide':'Publish'}</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </main>;
}
