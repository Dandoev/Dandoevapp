import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import prisma from '@/lib/prisma';

export const runtime='nodejs';
const schema=z.object({imei:z.string().regex(/^\d{15}$/),lockState:z.enum(['locked','unlocked','unknown']),batteryPercent:z.number().int().min(0).max(100),iotVoltage:z.number().min(0).max(100),signal:z.number().int().min(2).max(32),charging:z.boolean(),observedAt:z.iso.datetime({offset:true})});
export async function POST(req:NextRequest){
 const secret=process.env.OMNI_INGEST_SECRET;if(!secret||secret.length<32)return NextResponse.json({error:'Ingestion is not configured'},{status:503});
 const timestamp=req.headers.get('x-omni-timestamp')||'',signature=req.headers.get('x-omni-signature')||'',sent=Number(timestamp);
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-sent)>120000||!/^[0-9a-f]{64}$/.test(signature))return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.text();if(body.length>2048)return NextResponse.json({error:'Payload too large'},{status:413});
 const expected=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return NextResponse.json({error:'Unauthorized'},{status:401});
 let json:unknown;try{json=JSON.parse(body);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}const parsed=schema.safeParse(json);if(!parsed.success)return NextResponse.json({error:'Invalid telemetry'},{status:400});
 const t=parsed.data,observedAt=new Date(t.observedAt);if(observedAt.getTime()>Date.now()+120000||observedAt.getTime()<Date.now()-86400000)return NextResponse.json({error:'Telemetry timestamp out of range'},{status:422});
 try{const asset=await prisma.vehicleAsset.findUnique({where:{imei:t.imei},select:{id:true}});if(!asset)return NextResponse.json({error:'Device not registered'},{status:404});await prisma.vehicleTelemetry.upsert({where:{assetId_observedAt:{assetId:asset.id,observedAt}},create:{assetId:asset.id,lockState:t.lockState,batteryPercent:t.batteryPercent,iotVoltage:t.iotVoltage,signal:t.signal,charging:t.charging,observedAt},update:{}});return NextResponse.json({success:true});}catch{return NextResponse.json({error:'Telemetry storage unavailable'},{status:503});}
}
