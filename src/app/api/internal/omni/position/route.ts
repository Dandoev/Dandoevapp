import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
const fixSchema=z.object({imei:z.string().regex(/^\d{15}$/),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),observedAt:z.iso.datetime({offset:true}),satellites:z.number().int().min(0).max(100).nullable(),hdop:z.number().min(0).max(100).nullable(),estimated:z.boolean()});

export async function POST(req:NextRequest){
  const secret=process.env.OMNI_INGEST_SECRET;
  if(!secret||secret.length<32)return NextResponse.json({error:'Ingestion is not configured'},{status:503});
  const timestamp=req.headers.get('x-omni-timestamp')||'', signature=req.headers.get('x-omni-signature')||'';
  const sent=Number(timestamp);
  if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-sent)>120000||!/^[0-9a-f]{64}$/.test(signature))return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.text();
  if(body.length>2048)return NextResponse.json({error:'Payload too large'},{status:413});
  const expected=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return NextResponse.json({error:'Unauthorized'},{status:401});
  let parsed:unknown;
  try{parsed=JSON.parse(body);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  const result=fixSchema.safeParse(parsed);
  if(!result.success)return NextResponse.json({error:'Invalid position'},{status:400});
  const fix=result.data, observedAt=new Date(fix.observedAt);
  if(observedAt.getTime()>Date.now()+120000||observedAt.getTime()<Date.now()-86400000)return NextResponse.json({error:'Position timestamp out of range'},{status:422});
  try{
    const asset=await prisma.vehicleAsset.findUnique({where:{imei:fix.imei},select:{id:true}});
    if(!asset)return NextResponse.json({error:'Device not registered'},{status:404});
    await prisma.vehiclePosition.upsert({where:{assetId_observedAt:{assetId:asset.id,observedAt}},create:{assetId:asset.id,latitude:fix.latitude,longitude:fix.longitude,observedAt,satellites:fix.satellites,hdop:fix.hdop,estimated:fix.estimated},update:{}});
    return NextResponse.json({success:true});
  }catch{return NextResponse.json({error:'Position storage unavailable'},{status:503});}
}
