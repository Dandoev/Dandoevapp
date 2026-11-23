import {createHmac,randomInt,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import prisma from '@/lib/prisma';
import {hashOmniCard,normalizeOmniCard} from '@/lib/omni-card';

export const runtime='nodejs';
function authorized(req:NextRequest,body:string){const secret=process.env.OMNI_INGEST_SECRET,t=req.headers.get('x-omni-timestamp')||'',sig=req.headers.get('x-omni-signature')||'';if(!secret||secret.length<32||!/^\d{13}$/.test(t)||Math.abs(Date.now()-Number(t))>120000||!/^[0-9a-f]{64}$/.test(sig))return false;return timingSafeEqual(createHmac('sha256',secret).update(`${t}.${body}`).digest(),Buffer.from(sig,'hex'));}

export async function POST(req:NextRequest){
 const body=await req.text();if(body.length>512||!authorized(req,body))return NextResponse.json({error:'Unauthorized'},{status:401});
 let input:unknown;try{input=JSON.parse(body);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 const value=input as {imei?:unknown;cardNumber?:unknown;observedAt?:unknown};
 const card=normalizeOmniCard(value?.cardNumber),imei=value?.imei,observedAt=value?.observedAt;
 if(!card||typeof imei!=='string'||!/^\d{15}$/.test(imei)||typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt))||Math.abs(Date.now()-Date.parse(observedAt))>30000)return NextResponse.json({error:'Invalid card request'},{status:400});
 if(process.env.OMNI_RFID_UNLOCK_ENABLED!=='true')return NextResponse.json({decision:'denied',reason:'rfid_disabled'});
 let cardHash:string;try{cardHash=hashOmniCard(card);}catch{return NextResponse.json({error:'Card hashing unavailable'},{status:503});}
 const asset=await prisma.vehicleAsset.findUnique({where:{imei},select:{id:true,status:true,firmwareVersion:true,rfidVerified:true,unlockBlockedAt:true}});
 const credential=await prisma.vehicleCard.findUnique({where:{cardHash}});
 let reason='approved';
 if(!asset)reason='unknown_bike';
 else if(!credential||!credential.active)reason='unknown_or_revoked_card';
 else if(asset.unlockBlockedAt)reason='admin_blocked';
 else if(asset.status!=='active'||!asset.firmwareVersion||!asset.rfidVerified)reason='bike_ineligible';
 else if(!await prisma.vehicleAssignment.findFirst({where:{assetId:asset.id,riderId:credential.riderId,endedAt:null},select:{id:true}}))reason='not_assigned';
 else if(!await prisma.vehicleTelemetry.findFirst({where:{assetId:asset.id,observedAt:{gte:new Date(Date.now()-120000)}},select:{id:true}}))reason='stale_bike';
 else if(await prisma.vehicleCommand.findFirst({where:{assetId:asset.id,status:{in:['requested','queued','dispatched','acknowledged']},expiresAt:{gt:new Date()}},select:{id:true}}))reason='command_pending';
 else if(await prisma.vehicleCardEvent.findFirst({where:{assetId:asset.id,cardHash,createdAt:{gte:new Date(Date.now()-10000)}},select:{id:true}}))reason='tap_cooldown';
 await prisma.vehicleCardEvent.create({data:{assetId:asset?.id,cardHash,decision:reason==='approved'?'approved':'denied',reason,observedAt:new Date(observedAt)}});
 if(reason!=='approved'||!asset||!credential)return NextResponse.json({decision:'denied',reason});
 const command=await prisma.vehicleCommand.create({data:{assetId:asset.id,riderId:credential.riderId,operation:'unlock',actor:2,sequence:randomInt(1,2147483647),reason:'rfid_card',expiresAt:new Date(Date.now()+30000)}});
 return NextResponse.json({decision:'queued',commandId:command.id},{status:202});
}
